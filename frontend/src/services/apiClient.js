/**
 * Cliente HTTP do Cont.IA com retry automático e renovação de token.
 *
 * Funcionalidades:
 *  - Retry com backoff exponencial em erros de rede e status 5xx/408/429
 *  - Renovação automática do token Firebase (forceRefresh) em resposta 401
 *  - Timeout configurável por requisição (padrão: 120s para inferência YOLO)
 *  - Falha rápida em erros de negócio (422, 403) sem retry
 */
import Config from 'react-native-config';
import { getIdToken } from './authService';

const API_BASE_URL = Config.YOLO_API_URL || '';
const REQUEST_TIMEOUT_MS = 120000; // 120s — YOLO pode demorar na 1ª inferência

/** Status HTTP que justificam nova tentativa (erros transitórios). */
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 500, // 500ms → 1000ms → 2000ms (backoff exponencial)
  retryableStatuses: new Set([408, 429, 500, 502, 503, 504]),
};

/**
 * Determina se um erro justifica nova tentativa.
 * Retenta em falhas de rede e em status HTTP transitórios.
 * Nunca retenta em erros de negócio (422, 403, 401).
 *
 * @param {Error} error - Erro capturado
 * @param {number} status - Status HTTP da resposta (0 se não houver resposta)
 * @returns {boolean}
 */
function isRetryableError(error, status) {
  if (RETRY_CONFIG.retryableStatuses.has(status)) return true;
  const msg = error?.message?.toLowerCase() ?? '';
  return (
    msg.includes('network') ||
    msg.includes('connection') ||
    msg.includes('tempo limite')
  );
}

/** Aguarda `ms` milissegundos antes de resolver. */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executa uma requisição HTTP com token Firebase no header Authorization.
 * Em resposta 401, tenta renovar o token uma vez (forceRefresh) antes de falhar.
 *
 * @param {string} path - Caminho relativo (ex: '/v1/detect')
 * @param {RequestInit} options - Opções do fetch (method, body, headers)
 * @param {number} timeout - Timeout em milissegundos
 * @param {boolean} forceRefresh - Se true, força renovação do token Firebase
 * @returns {Promise<any>} Payload JSON da resposta
 * @throws {Error} Com o campo `status` preenchido para erros HTTP
 */
async function executeRequest(path, options, timeout, forceRefresh) {
  let token = null;
  try {
    token = await getIdToken(forceRefresh);
  } catch (_) {
    // sem usuário logado — o backend rejeitará com 401
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });

    // Token expirado: tenta uma vez com forceRefresh antes de lançar erro
    if (response.status === 401 && !forceRefresh) {
      return executeRequest(path, options, timeout, true);
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (_) {
      // sem JSON
    }

    if (!response.ok) {
      const message =
        payload?.detail || payload?.message || `Erro HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Tempo limite excedido na requisição.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Executa uma requisição com retry automático usando backoff exponencial.
 * Apenas erros retentáveis (rede, 5xx, 408, 429) são tentados novamente.
 *
 * @param {string} path - Caminho relativo da API
 * @param {RequestInit} options - Opções do fetch
 * @param {number} [timeout] - Timeout em ms (padrão: 120000)
 * @returns {Promise<any>}
 * @throws {Error} Após esgotar todas as tentativas
 */
async function requestWithRetry(
  path,
  options = {},
  timeout = REQUEST_TIMEOUT_MS,
) {
  if (!API_BASE_URL) {
    throw new Error('YOLO_API_URL não configurada no .env.');
  }

  let lastError;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await executeRequest(path, options, timeout, false);
    } catch (error) {
      lastError = error;

      const isLast = attempt === RETRY_CONFIG.maxAttempts;
      const shouldRetry = isRetryableError(error, error?.status);

      if (isLast || !shouldRetry) throw error;

      const waitMs = RETRY_CONFIG.baseDelayMs * 2 ** (attempt - 1);
      await delay(waitMs);
    }
  }

  throw lastError;
}

/**
 * Cliente HTTP do Cont.IA.
 *
 * @example
 * const data = await apiClient.post('/v1/detect', { image_base64: base64 });
 * await apiClient.delete('/v1/user/account');
 */
export const apiClient = {
  /**
   * Envia uma requisição POST com corpo JSON.
   * @param {string} path - Caminho relativo (ex: '/v1/detect')
   * @param {object} body - Corpo da requisição (será serializado como JSON)
   * @param {RequestInit} [options] - Opções adicionais do fetch
   */
  post: (path, body, options = {}) =>
    requestWithRetry(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }),

  /**
   * Envia uma requisição DELETE.
   * @param {string} path - Caminho relativo (ex: '/v1/user/account')
   * @param {RequestInit} [options] - Opções adicionais do fetch
   */
  delete: (path, options = {}) =>
    requestWithRetry(path, {
      method: 'DELETE',
      ...options,
    }),
};

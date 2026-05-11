import Config from 'react-native-config';
import { getIdToken } from './authService';

const API_BASE_URL = Config.YOLO_API_URL || '';
const REQUEST_TIMEOUT_MS = 120000; // 120s — YOLO pode demorar na 1ª inferência

const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 500, // 500ms → 1000ms → 2000ms (backoff exponencial)
  retryableStatuses: new Set([408, 429, 500, 502, 503, 504]),
};

function isRetryableError(error, status) {
  if (RETRY_CONFIG.retryableStatuses.has(status)) return true;
  const msg = error?.message?.toLowerCase() ?? '';
  return (
    msg.includes('network') ||
    msg.includes('connection') ||
    msg.includes('tempo limite')
  );
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

export const apiClient = {
  post: (path, body, options = {}) =>
    requestWithRetry(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }),

  delete: (path, options = {}) =>
    requestWithRetry(path, {
      method: 'DELETE',
      ...options,
    }),
};

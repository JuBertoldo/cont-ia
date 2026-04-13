import Config from 'react-native-config';
import { getIdToken } from './authService';

const API_BASE_URL = Config.YOLO_API_URL || '';
const REQUEST_TIMEOUT_MS = 120000; // 120s — YOLO pode demorar na 1ª inferência

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
      throw new Error(message);
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

async function request(path, options = {}, timeout = REQUEST_TIMEOUT_MS) {
  if (!API_BASE_URL) {
    throw new Error('YOLO_API_URL não configurada no .env.');
  }
  return executeRequest(path, options, timeout, false);
}

export const apiClient = {
  post: (path, body, options = {}) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }),
};

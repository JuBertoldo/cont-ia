import { Alert } from 'react-native';

/**
 * Extrai uma mensagem legível de um erro desconhecido.
 * Usado para padronizar mensagens de erro em serviços e telas.
 */
export function getErrorMessage(
  error,
  fallback = 'Ocorreu um erro inesperado.',
) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  return error?.message || fallback;
}

/**
 * Exibe um Alert de erro padronizado.
 * @param {Error|string} error
 * @param {string} [fallback]
 */
export function showErrorAlert(error, fallback) {
  Alert.alert('Erro', getErrorMessage(error, fallback));
}

/**
 * Wrapper para operações assíncronas que exibe Alert em caso de falha
 * e opcionalmente executa finally.
 *
 * @param {() => Promise<void>} fn
 * @param {string} [fallback]
 * @returns {Promise<void>}
 */
export async function withErrorAlert(fn, fallback) {
  try {
    await fn();
  } catch (error) {
    showErrorAlert(error, fallback);
  }
}

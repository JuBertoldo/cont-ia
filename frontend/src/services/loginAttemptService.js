/**
 * Serviço de controle de tentativas de login.
 *
 * Protege contra ataques de força bruta bloqueando o usuário por 15 minutos
 * após 5 tentativas de login falhas com o mesmo e-mail.
 * Os dados são persistidos no AsyncStorage (local, por dispositivo).
 *
 * Chave de armazenamento: `@contia_login_attempts_<email_lowercase>`
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

const KEY_PREFIX = '@contia_login_attempts_';
export const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Lê os dados de tentativas para um e-mail do AsyncStorage.
 * Retorna valores padrão seguros em caso de erro ou ausência de dados.
 *
 * @param {string} email
 * @returns {Promise<{ count: number, blockedUntil: number | null }>}
 */
async function getAttemptData(email) {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + email.toLowerCase());
    return raw ? JSON.parse(raw) : { count: 0, blockedUntil: null };
  } catch {
    return { count: 0, blockedUntil: null };
  }
}

/**
 * Persiste os dados de tentativas no AsyncStorage.
 *
 * @param {string} email
 * @param {{ count: number, blockedUntil: number | null }} data
 */
async function saveAttemptData(email, data) {
  try {
    await AsyncStorage.setItem(
      KEY_PREFIX + email.toLowerCase(),
      JSON.stringify(data),
    );
  } catch (error) {
    logger.error('loginAttemptService:saveAttemptData', error);
  }
}

/**
 * Verifica se o usuário está bloqueado por excesso de tentativas.
 * Se o bloqueio expirou, limpa os dados automaticamente.
 *
 * @param {string} email - E-mail do usuário
 * @returns {Promise<{ blocked: boolean, remainingMinutes: number }>}
 *   - `blocked`: true se o usuário não pode tentar login agora
 *   - `remainingMinutes`: minutos restantes do bloqueio (0 se não bloqueado)
 */
export async function checkLoginBlock(email) {
  const data = await getAttemptData(email);
  if (!data.blockedUntil) return { blocked: false, remainingMinutes: 0 };

  const remaining = data.blockedUntil - Date.now();
  if (remaining <= 0) {
    await saveAttemptData(email, { count: 0, blockedUntil: null });
    return { blocked: false, remainingMinutes: 0 };
  }

  return { blocked: true, remainingMinutes: Math.ceil(remaining / 60000) };
}

/**
 * Registra uma tentativa de login falha.
 * Ao atingir MAX_LOGIN_ATTEMPTS, define um bloqueio de 15 minutos.
 *
 * @param {string} email - E-mail que falhou no login
 * @returns {Promise<{ count: number, blocked: boolean }>}
 *   - `count`: total de tentativas falhas consecutivas
 *   - `blocked`: true se o bloqueio foi ativado nesta tentativa
 */
export async function recordFailedAttempt(email) {
  const data = await getAttemptData(email);
  const count = (data.count || 0) + 1;
  const blockedUntil =
    count >= MAX_LOGIN_ATTEMPTS ? Date.now() + BLOCK_DURATION_MS : null;
  await saveAttemptData(email, { count, blockedUntil });
  return { count, blocked: count >= MAX_LOGIN_ATTEMPTS };
}

/**
 * Limpa o histórico de tentativas falhas após login bem-sucedido.
 * Deve ser chamado sempre que o login for concluído com sucesso.
 *
 * @param {string} email - E-mail do usuário que fez login com sucesso
 */
export async function clearLoginAttempts(email) {
  try {
    await AsyncStorage.removeItem(KEY_PREFIX + email.toLowerCase());
  } catch (error) {
    logger.error('loginAttemptService:clearLoginAttempts', error);
  }
}

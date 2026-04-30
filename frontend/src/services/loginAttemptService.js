import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

const KEY_PREFIX = '@contia_login_attempts_';
export const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

async function getAttemptData(email) {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + email.toLowerCase());
    return raw ? JSON.parse(raw) : { count: 0, blockedUntil: null };
  } catch {
    return { count: 0, blockedUntil: null };
  }
}

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

export async function recordFailedAttempt(email) {
  const data = await getAttemptData(email);
  const count = (data.count || 0) + 1;
  const blockedUntil =
    count >= MAX_LOGIN_ATTEMPTS ? Date.now() + BLOCK_DURATION_MS : null;
  await saveAttemptData(email, { count, blockedUntil });
  return { count, blocked: count >= MAX_LOGIN_ATTEMPTS };
}

export async function clearLoginAttempts(email) {
  try {
    await AsyncStorage.removeItem(KEY_PREFIX + email.toLowerCase());
  } catch (error) {
    logger.error('loginAttemptService:clearLoginAttempts', error);
  }
}

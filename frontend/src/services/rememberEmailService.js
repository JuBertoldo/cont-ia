import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

const KEYS = {
  REMEMBER_EMAIL: '@contia_remember_email',
  SAVED_EMAIL: '@contia_saved_email',
};

export async function getRememberEmailData() {
  try {
    const rememberRaw = await AsyncStorage.getItem(KEYS.REMEMBER_EMAIL);
    const emailRaw = await AsyncStorage.getItem(KEYS.SAVED_EMAIL);

    return {
      rememberEmail: rememberRaw === 'true',
      email: emailRaw || '',
    };
  } catch (error) {
    logger.error('rememberEmailService:getRememberEmailData', error);
    return {
      rememberEmail: false,
      email: '',
    };
  }
}

export async function saveRememberEmailData({ rememberEmail, email }) {
  try {
    if (rememberEmail) {
      await AsyncStorage.setItem(KEYS.REMEMBER_EMAIL, 'true');
      await AsyncStorage.setItem(KEYS.SAVED_EMAIL, (email || '').trim());
      return;
    }

    await AsyncStorage.setItem(KEYS.REMEMBER_EMAIL, 'false');
    await AsyncStorage.removeItem(KEYS.SAVED_EMAIL);
  } catch (error) {
    logger.error('rememberEmailService:saveRememberEmailData', error);
  }
}

export async function updateSavedEmail(email) {
  try {
    await AsyncStorage.setItem(KEYS.SAVED_EMAIL, (email || '').trim());
  } catch (error) {
    logger.error('rememberEmailService:updateSavedEmail', error);
  }
}

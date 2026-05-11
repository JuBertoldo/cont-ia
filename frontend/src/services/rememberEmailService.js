/**
 * Serviço de "lembrar e-mail" na tela de login.
 *
 * Persiste no AsyncStorage a preferência do usuário de salvar o e-mail
 * entre sessões, evitando que precise digitar a cada abertura do app.
 * O e-mail só é salvo APÓS um login bem-sucedido (não durante a digitação).
 *
 * Chaves de armazenamento:
 *   `@contia_remember_email` — boolean ('true' | 'false')
 *   `@contia_saved_email`    — e-mail salvo (string)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

const KEYS = {
  REMEMBER_EMAIL: '@contia_remember_email',
  SAVED_EMAIL: '@contia_saved_email',
};

/**
 * Lê a preferência e o e-mail salvo do AsyncStorage.
 *
 * @returns {Promise<{ rememberEmail: boolean, email: string }>}
 *   - `rememberEmail`: true se o usuário optou por lembrar o e-mail
 *   - `email`: e-mail salvo (string vazia se não houver)
 */
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

/**
 * Salva ou limpa a preferência de "lembrar e-mail".
 * Se `rememberEmail` for false, remove o e-mail salvo do AsyncStorage.
 *
 * @param {{ rememberEmail: boolean, email: string }} params
 */
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

/**
 * Atualiza apenas o e-mail salvo sem alterar a preferência de "lembrar".
 * Usado após troca de e-mail no perfil para manter o dado sincronizado.
 *
 * @param {string} email - Novo e-mail a ser salvo
 */
export async function updateSavedEmail(email) {
  try {
    await AsyncStorage.setItem(KEYS.SAVED_EMAIL, (email || '').trim());
  } catch (error) {
    logger.error('rememberEmailService:updateSavedEmail', error);
  }
}

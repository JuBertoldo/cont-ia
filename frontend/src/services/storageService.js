import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebaseConfig';
import logger from '../utils/logger';

export const uploadImage = async ({
  uri,
  path,
  contentType = 'image/jpeg',
}) => {
  try {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new TypeError('Falha ao carregar imagem'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType });

    return await getDownloadURL(storageRef);
  } catch (error) {
    logger.error('Erro ao fazer upload da imagem:', error);
    throw error;
  }
};

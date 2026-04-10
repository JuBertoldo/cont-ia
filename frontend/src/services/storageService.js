import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebaseConfig';

export const uploadImage = async ({
  uri,
  path,
  contentType = 'image/jpeg',
}) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType });

    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    throw error;
  }
};

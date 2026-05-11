/**
 * Serviço de perfil do usuário.
 *
 * Gerencia a leitura e atualização dos dados de perfil,
 * sincronizando Firebase Auth e o documento Firestore `/usuarios/{uid}`.
 * Sempre atualiza os dois em conjunto para manter consistência.
 */
import { auth, db } from '../config/firebaseConfig';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { uploadImage } from './storageService';

/**
 * Busca os dados de perfil do usuário no Firestore.
 *
 * @param {string} uid - UID do usuário
 * @returns {Promise<object | null>} Dados do documento ou null se não existir
 */
export const getProfile = async uid => {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? snap.data() : null;
};

/**
 * Atualiza o nome do usuário no Firebase Auth e no Firestore.
 * Ambos são atualizados atomicamente para evitar inconsistência.
 *
 * @param {string} uid - UID do usuário
 * @param {string} name - Novo nome (já validado pelo chamador)
 */
export const updateProfileName = async (uid, name) => {
  await updateProfile(auth.currentUser, { displayName: name });

  await setDoc(
    doc(db, 'usuarios', uid),
    {
      nome: name,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

/**
 * Atualiza a data de nascimento do usuário no Firestore.
 *
 * @param {string} uid - UID do usuário
 * @param {string} birthDate - Data no formato DD/MM/AAAA
 */
export const updateProfileBirthDate = async (uid, birthDate) => {
  await setDoc(
    doc(db, 'usuarios', uid),
    {
      birthDate,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

/**
 * Atualiza a foto de perfil do usuário.
 * Faz upload para Firebase Storage e sincroniza a URL no Auth e Firestore.
 *
 * @param {string} uid - UID do usuário
 * @param {string} uri - URI local da imagem (file:// — iOS/Android)
 * @returns {Promise<string>} URL pública da foto no Firebase Storage
 * @throws {Error} Se o upload falhar
 */
export const updateProfilePhoto = async (uid, uri) => {
  const downloadURL = await uploadImage({
    uri,
    path: `perfil/${uid}/avatar.jpg`,
  });

  await updateProfile(auth.currentUser, { photoURL: downloadURL });

  await setDoc(
    doc(db, 'usuarios', uid),
    {
      photoURL: downloadURL,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return downloadURL;
};

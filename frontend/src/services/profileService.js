import { auth, db } from '../config/firebaseConfig';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { uploadImage } from './storageService';

export const getProfile = async uid => {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? snap.data() : null;
};

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

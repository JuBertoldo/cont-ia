import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const loginWithGoogleIdToken = async (idToken) => {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  const user = result.user;

  const userRef = doc(db, 'usuarios', user.uid);
  const snap = await getDoc(userRef);

  const baseData = {
    nome: user.displayName || 'Usuário',
    email: user.email || '',
    birthDate: '',
    photoURL: user.photoURL || '',
    role: 'user',
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    await setDoc(
      userRef,
      {
        ...baseData,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    const data = snap.data();

    await setDoc(
      userRef,
      {
        nome: data.nome || baseData.nome,
        email: data.email || baseData.email,
        birthDate: data.birthDate || baseData.birthDate,
        photoURL: data.photoURL || baseData.photoURL,
        role: data.role || 'user',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return user;
};
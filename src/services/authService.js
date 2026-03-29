import { auth, db } from '../config/firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const registerWithEmail = async ({ name, email, password }) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName: name });

  await setDoc(
    doc(db, 'usuarios', user.uid),
    {
      nome: name,
      email,
      birthDate: '',
      photoURL: '',
      role: 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return user;
};

export const loginWithEmail = async ({ email, password }) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

export const logout = async () => {
  await signOut(auth);
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = async (uid, data) => {
  await setDoc(
    doc(db, 'usuarios', uid),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};
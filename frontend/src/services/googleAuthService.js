import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { createEmpresa, getEmpresaByCodigo } from './empresaService';

// Chame uma vez na inicialização do app (ex: App.js)
export const configureGoogleSignIn = webClientId => {
  GoogleSignin.configure({ webClientId });
};

export const signInWithGoogle = async ({ codigoEmpresa, matricula } = {}) => {
  await GoogleSignin.hasPlayServices();
  const { data } = await GoogleSignin.signIn();
  const idToken = data?.idToken;

  if (!idToken) throw new Error('Falha ao obter token do Google.');

  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  const user = result.user;

  const userRef = doc(db, 'usuarios', user.uid);
  const snap = await getDoc(userRef);

  // Usuário já existe → só retorna (AuthHome verifica o status)
  if (snap.exists()) {
    return { user, isNewUser: false };
  }

  // Novo usuário → verifica se é o primeiro do sistema
  const usersSnap = await getDocs(collection(db, 'usuarios'));
  const isFirstUser = usersSnap.empty;

  let empresaId = null;
  let role = 'user';
  let status = 'pending';

  if (isFirstUser) {
    // Primeiro usuário → cria empresa com nome do Google
    const empresa = await createEmpresa(
      user.displayName || 'Minha Empresa',
      user.uid,
    );
    empresaId = empresa.id;
    role = 'admin';
    status = 'active';
  } else {
    if (!codigoEmpresa?.trim()) {
      const error = new Error(
        'Código da empresa obrigatório para novo usuário.',
      );
      error.code = 'auth/codigo-required';
      throw error;
    }
    const empresa = await getEmpresaByCodigo(codigoEmpresa);
    if (!empresa) {
      const error = new Error('Código de empresa inválido.');
      error.code = 'auth/codigo-invalido';
      throw error;
    }
    empresaId = empresa.id;
  }

  await setDoc(userRef, {
    nome: user.displayName || 'Usuário Google',
    email: user.email || '',
    matricula: matricula?.trim() || '',
    photoURL: user.photoURL || '',
    role,
    status,
    empresaId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { user, isNewUser: true, status };
};

export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
  } catch {
    /* ignora */
  }
};

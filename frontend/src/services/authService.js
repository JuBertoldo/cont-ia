import { auth, db } from '../config/firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  getIdToken as firebaseGetIdToken,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { createEmpresa, getEmpresaByCodigo } from './empresaService';

// ── Matrícula ─────────────────────────────────────────────────────────────────

export const checkMatriculaExists = async (matricula, empresaId) => {
  const q = query(
    collection(db, 'usuarios'),
    where('matricula', '==', matricula.trim()),
    where('empresaId', '==', empresaId),
  );
  const snap = await getDocs(q);
  return !snap.empty;
};

// ── Registro ──────────────────────────────────────────────────────────────────

export const registerWithEmail = async ({
  name,
  email,
  password,
  matricula,
  codigoEmpresa,
  nomeEmpresa,
}) => {
  const cleanMatricula = matricula?.trim() || '';
  const cleanCodigo = codigoEmpresa?.trim().toUpperCase() || '';
  const criarEmpresa = !!nomeEmpresa?.trim(); // true = quer criar empresa nova

  let empresaId = null;

  if (criarEmpresa) {
    // Criar empresa nova — vira admin ativo
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;
    await updateProfile(user, { displayName: name });

    const empresa = await createEmpresa(nomeEmpresa.trim(), user.uid);
    empresaId = empresa.id;

    await setDoc(doc(db, 'usuarios', user.uid), {
      nome: name,
      email,
      matricula: cleanMatricula,
      photoURL: '',
      role: 'admin',
      status: 'active',
      empresaId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return user;
  }

  // Entrar em empresa existente: precisa do código
  if (!cleanCodigo) {
    const error = new Error('Código da empresa obrigatório.');
    error.code = 'auth/codigo-required';
    throw error;
  }

  const empresa = await getEmpresaByCodigo(cleanCodigo);
  if (!empresa) {
    const error = new Error('Código de empresa inválido.');
    error.code = 'auth/codigo-invalido';
    throw error;
  }
  empresaId = empresa.id;

  // Verifica duplicata de matrícula na empresa
  if (cleanMatricula) {
    const exists = await checkMatriculaExists(cleanMatricula, empresaId);
    if (exists) {
      const error = new Error('Matrícula já cadastrada nesta empresa.');
      error.code = 'auth/matricula-already-in-use';
      throw error;
    }
  }

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;
  await updateProfile(user, { displayName: name });

  await setDoc(doc(db, 'usuarios', user.uid), {
    nome: name,
    email,
    matricula: cleanMatricula,
    photoURL: '',
    role: 'user',
    status: 'pending',
    empresaId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
};

// ── Login ─────────────────────────────────────────────────────────────────────

export const loginWithEmail = async ({ email, password }) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
  return userCredential.user;
};

// ── Status do usuário ─────────────────────────────────────────────────────────

export const getUserStatus = async uid => {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists()) return 'pending';
  return snap.data()?.status || 'pending';
};

// ── Outros ────────────────────────────────────────────────────────────────────

export const resetPassword = async email => {
  await sendPasswordResetEmail(auth, email);
};

export const logout = async () => {
  await signOut(auth);
};

export const getUserProfile = async uid => {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = async (uid, data) => {
  await setDoc(
    doc(db, 'usuarios', uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
};

export const getIdToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');
  return firebaseGetIdToken(user);
};

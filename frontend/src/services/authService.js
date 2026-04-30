import { auth, db } from '../config/firebaseConfig';
import {
  criarNotificacaoParaAdminsEmpresa,
  NOTIF_TIPOS,
} from './notificationService';
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
  addDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { COLLECTIONS } from '../constants/collections';
import { ROLES } from '../constants/roles';
import { createEmpresa, getEmpresaByCodigo } from './empresaService';

// ── Matrícula ─────────────────────────────────────────────────────────────────

export const checkMatriculaExists = async (matricula, empresaId) => {
  const q = query(
    collection(db, COLLECTIONS.USERS),
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
  const criarEmpresa = !!nomeEmpresa?.trim();

  let empresaId = null;

  if (criarEmpresa) {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    try {
      await updateProfile(user, { displayName: name });

      const empresa = await createEmpresa(nomeEmpresa.trim(), user.uid);
      empresaId = empresa.id;

      await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        nome: name,
        email,
        matricula: cleanMatricula,
        photoURL: '',
        role: ROLES.ADMIN,
        status: 'active',
        empresaId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return user;
    } catch (err) {
      await user.delete().catch(() => {});
      throw err;
    }
  }

  if (!cleanCodigo) {
    const error = new Error('Código da empresa obrigatório.');
    error.code = 'auth/codigo-required';
    throw error;
  }

  // Cria o usuário no Firebase Auth primeiro para ter autenticação nas leituras seguintes
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;

  try {
    await updateProfile(user, { displayName: name });

    const empresa = await getEmpresaByCodigo(cleanCodigo);
    if (!empresa) {
      const error = new Error('Código de empresa inválido.');
      error.code = 'auth/codigo-invalido';
      throw error;
    }
    empresaId = empresa.id;

    if (cleanMatricula) {
      const exists = await checkMatriculaExists(cleanMatricula, empresaId);
      if (exists) {
        const error = new Error('Matrícula já cadastrada nesta empresa.');
        error.code = 'auth/matricula-already-in-use';
        throw error;
      }
    }

    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
      nome: name,
      email,
      matricula: cleanMatricula,
      photoURL: '',
      role: ROLES.USER,
      status: 'pending',
      empresaId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Notifica os admins da empresa sobre o novo usuário pendente
    criarNotificacaoParaAdminsEmpresa(
      empresaId,
      NOTIF_TIPOS.NOVO_USUARIO,
      'Novo usuário aguardando aprovação',
      `${name} quer entrar na sua empresa. Acesse Gerenciar Usuários para aprovar.`,
      { usuarioId: user.uid, usuarioNome: name, rota: 'AdminUsers' },
    ).catch(() => {});

    return user;
  } catch (err) {
    // Reverte o usuário criado no Auth se qualquer etapa posterior falhar
    await user.delete().catch(() => {});
    throw err;
  }
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
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
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
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = async (uid, data) => {
  await setDoc(
    doc(db, COLLECTIONS.USERS, uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
};

export const getIdToken = async (forceRefresh = false) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');
  return firebaseGetIdToken(user, forceRefresh);
};

export const logLoginAudit = async (uid, success) => {
  try {
    await addDoc(collection(db, COLLECTIONS.LOGIN_AUDIT), {
      uid,
      success,
      timestamp: serverTimestamp(),
    });
  } catch {
    // falha no audit não deve bloquear o login
  }
};

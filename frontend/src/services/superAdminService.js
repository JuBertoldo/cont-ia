import { db, auth } from '../config/firebaseConfig';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

async function assertSuperAdmin() {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('Não autenticado.');
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists() || snap.data()?.role !== 'super_admin') {
    throw new Error('Acesso negado. Requer perfil super admin.');
  }
}

// ── Empresas ──────────────────────────────────────────────────────────────────

export const getAllEmpresas = async () => {
  await assertSuperAdmin();
  const snap = await getDocs(
    query(collection(db, 'empresas'), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteEmpresa = async empresaId => {
  await assertSuperAdmin();
  await deleteDoc(doc(db, 'empresas', empresaId));
};

// ── Usuários (global) ─────────────────────────────────────────────────────────

export const getAllUsersGlobal = async () => {
  await assertSuperAdmin();
  const snap = await getDocs(
    query(collection(db, 'usuarios'), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteUserGlobal = async uid => {
  await assertSuperAdmin();
  await deleteDoc(doc(db, 'usuarios', uid));
};

export const updateUserRoleGlobal = async (uid, newRole) => {
  await assertSuperAdmin();
  if (!['user', 'admin', 'super_admin'].includes(newRole))
    throw new Error('Role inválido.');
  await updateDoc(doc(db, 'usuarios', uid), {
    role: newRole,
    updatedAt: serverTimestamp(),
  });
};

// ── Inventário (global) ───────────────────────────────────────────────────────

export const getAllScansGlobal = async () => {
  await assertSuperAdmin();
  const snap = await getDocs(
    query(collection(db, 'inventario'), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteScanGlobal = async docId => {
  await assertSuperAdmin();
  await deleteDoc(doc(db, 'inventario', docId));
};

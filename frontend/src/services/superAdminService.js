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
import { COLLECTIONS } from '../constants/collections';
import { ROLES } from '../constants/roles';

async function assertSuperAdmin() {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('Não autenticado.');
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists() || snap.data()?.role !== ROLES.SUPER_ADMIN) {
    throw new Error('Acesso negado. Requer perfil super admin.');
  }
}

// ── Empresas ──────────────────────────────────────────────────────────────────

export const getAllEmpresas = async () => {
  await assertSuperAdmin();
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.COMPANIES), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteEmpresa = async empresaId => {
  await assertSuperAdmin();
  await deleteDoc(doc(db, COLLECTIONS.COMPANIES, empresaId));
};

// ── Usuários (global) ─────────────────────────────────────────────────────────

export const getAllUsersGlobal = async () => {
  await assertSuperAdmin();
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.USERS), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteUserGlobal = async uid => {
  await assertSuperAdmin();
  await deleteDoc(doc(db, COLLECTIONS.USERS, uid));
};

export const updateUserRoleGlobal = async (uid, newRole) => {
  await assertSuperAdmin();
  if (![ROLES.USER, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(newRole)) {
    throw new Error('Role inválido.');
  }
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    role: newRole,
    updatedAt: serverTimestamp(),
  });
};

// ── Inventário (global) ───────────────────────────────────────────────────────

export const getAllScansGlobal = async () => {
  await assertSuperAdmin();
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.INVENTORY), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteScanGlobal = async docId => {
  await assertSuperAdmin();
  await deleteDoc(doc(db, COLLECTIONS.INVENTORY, docId));
};

import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { COLLECTIONS } from '../constants/collections';
import { ROLES } from '../constants/roles';

/** Retorna o uid do usuário autenticado ou null */
export function getCurrentUserId() {
  return auth?.currentUser?.uid || null;
}

/** Retorna { role, empresaId } do usuário autenticado */
export async function getCurrentUserProfile() {
  const uid = getCurrentUserId();
  if (!uid) return { role: ROLES.USER, empresaId: null };

  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return { role: ROLES.USER, empresaId: null };

  const data = snap.data();
  return {
    role: data?.role || ROLES.USER,
    empresaId: data?.empresaId || null,
  };
}

/** Retorna apenas o empresaId do usuário autenticado */
export async function getCurrentEmpresaId() {
  const { empresaId } = await getCurrentUserProfile();
  return empresaId;
}

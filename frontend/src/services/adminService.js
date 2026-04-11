import { db } from '../config/firebaseConfig';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { COLLECTIONS } from '../constants/collections';
import { ROLES } from '../constants/roles';
import { getCurrentEmpresaId } from '../utils/userUtils';

/**
 * Busca todos os usuários da empresa do admin logado.
 * Sem orderBy para evitar dependência de índice composto no Firestore.
 * Ordenação feita client-side por createdAt.
 */
export const getAllUsers = async () => {
  const empresaId = await getCurrentEmpresaId();

  if (!empresaId) {
    throw new Error(
      'Empresa não encontrada. Verifique sua conta e tente novamente.',
    );
  }

  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('empresaId', '==', empresaId),
  );

  const snapshot = await getDocs(q);
  const users = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  return users.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
    const bTime = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
    return bTime - aTime;
  });
};

export const approveUser = async uid => {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    status: 'active',
    updatedAt: serverTimestamp(),
  });
};

export const rejectUser = async uid => {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
};

export const updateUserRole = async (uid, newRole) => {
  if (![ROLES.ADMIN, ROLES.USER].includes(newRole)) {
    throw new Error('Role inválido.');
  }
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    role: newRole,
    updatedAt: serverTimestamp(),
  });
};

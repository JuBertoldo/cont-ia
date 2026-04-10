import { auth, db } from '../config/firebaseConfig';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

async function getCurrentEmpresaId() {
  const uid = auth?.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? snap.data()?.empresaId || null : null;
}

export const getAllUsers = async () => {
  const empresaId = await getCurrentEmpresaId();

  const q = empresaId
    ? query(
        collection(db, 'usuarios'),
        where('empresaId', '==', empresaId),
        orderBy('createdAt', 'desc'),
      )
    : query(collection(db, 'usuarios'), orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
};

export const approveUser = async uid => {
  await updateDoc(doc(db, 'usuarios', uid), {
    status: 'active',
    updatedAt: serverTimestamp(),
  });
};

export const rejectUser = async uid => {
  await updateDoc(doc(db, 'usuarios', uid), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
};

export const updateUserRole = async (uid, newRole) => {
  if (!['admin', 'user'].includes(newRole)) throw new Error('Role inválido.');
  await updateDoc(doc(db, 'usuarios', uid), {
    role: newRole,
    updatedAt: serverTimestamp(),
  });
};

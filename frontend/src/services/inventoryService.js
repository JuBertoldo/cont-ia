import { auth, db } from '../config/firebaseConfig';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

async function getCurrentEmpresaId() {
  const uid = auth?.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? snap.data()?.empresaId || null : null;
}

export const createInventoryItem = async data => {
  const empresaId = await getCurrentEmpresaId();

  const docRef = await addDoc(collection(db, 'inventario'), {
    ...data,
    empresaId: empresaId || data.empresaId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const subscribeToUserInventory = (uid, callback, onError) => {
  const q = query(
    collection(db, 'inventario'),
    where('usuarioId', '==', uid),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    q,
    snapshot => {
      const items = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      callback(items);
    },
    onError,
  );
};

// Admin pode contestar contagens de OUTROS usuários (nunca a própria)
export const contestScan = async (docId, contestReason, ownerUid) => {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('Não autenticado.');
  if (uid === ownerUid)
    throw new Error('Você não pode contestar sua própria contagem.');
  await updateDoc(doc(db, 'inventario', docId), {
    status: 'contested',
    contestReason,
    contestedBy: uid,
    contestedAt: serverTimestamp(),
  });
};

export const subscribeToAllInventory = (empresaId, callback, onError) => {
  const q = empresaId
    ? query(
        collection(db, 'inventario'),
        where('empresaId', '==', empresaId),
        orderBy('createdAt', 'desc'),
      )
    : query(collection(db, 'inventario'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    snapshot => {
      const items = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      callback(items);
    },
    onError,
  );
};

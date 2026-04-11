import { auth, db } from '../config/firebaseConfig';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { COLLECTIONS } from '../constants/collections';
import { PAGE_SIZE } from '../constants/config';
import { getCurrentEmpresaId } from '../utils/userUtils';

export const createInventoryItem = async data => {
  const empresaId = await getCurrentEmpresaId();

  const docRef = await addDoc(collection(db, COLLECTIONS.INVENTORY), {
    ...data,
    empresaId: empresaId || data.empresaId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const subscribeToUserInventory = (uid, callback, onError) => {
  const q = query(
    collection(db, COLLECTIONS.INVENTORY),
    where('usuarioId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
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
  if (uid === ownerUid) {
    throw new Error('Você não pode contestar sua própria contagem.');
  }
  await updateDoc(doc(db, COLLECTIONS.INVENTORY, docId), {
    status: 'contested',
    contestReason,
    contestedBy: uid,
    contestedAt: serverTimestamp(),
  });
};

export const subscribeToAllInventory = (empresaId, callback, onError) => {
  const q = empresaId
    ? query(
        collection(db, COLLECTIONS.INVENTORY),
        where('empresaId', '==', empresaId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE),
      )
    : query(
        collection(db, COLLECTIONS.INVENTORY),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE),
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

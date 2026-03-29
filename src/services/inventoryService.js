import { db } from '../config/firebaseConfig';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

export const createInventoryItem = async (data) => {
  const docRef = await addDoc(collection(db, 'inventario'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const subscribeToUserInventory = (uid, callback, onError) => {
  const q = query(
    collection(db, 'inventario'),
    where('usuarioId', '==', uid),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      callback(items);
    },
    onError
  );
};

export const subscribeToAllInventory = (callback, onError) => {
  const q = query(collection(db, 'inventario'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      callback(items);
    },
    onError
  );
};
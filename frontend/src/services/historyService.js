import { auth, db } from '../config/firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

function getCurrentUserId() {
  return auth?.currentUser?.uid || null;
}

async function getCurrentUserProfile() {
  const uid = getCurrentUserId();
  if (!uid) return { role: 'user', empresaId: null };

  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists()) return { role: 'user', empresaId: null };

  const data = snap.data();
  return { role: data?.role || 'user', empresaId: data?.empresaId || null };
}

export async function getCurrentUserRole() {
  const { role } = await getCurrentUserProfile();
  return role;
}

export function buildInventoryHistoryQuery({ role, uid, empresaId }) {
  if (!uid) throw new Error('Usuário não autenticado.');

  if (role === 'admin' && empresaId) {
    return query(
      collection(db, 'inventario'),
      where('empresaId', '==', empresaId),
      orderBy('createdAt', 'desc'),
    );
  }

  return query(
    collection(db, 'inventario'),
    where('usuarioId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
}

export async function subscribeInventoryHistory({ onData, onError }) {
  const uid = getCurrentUserId();

  if (!uid) {
    onData?.([], 'user');
    return () => {};
  }

  const { role, empresaId } = await getCurrentUserProfile();
  const q = buildInventoryHistoryQuery({ role, uid, empresaId });

  const unsubscribe = onSnapshot(
    q,
    snapshot => {
      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      onData?.(list, role);
    },
    error => onError?.(error),
  );

  return unsubscribe;
}

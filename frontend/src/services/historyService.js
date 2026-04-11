import { auth, db } from '../config/firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  startAfter,
} from 'firebase/firestore';
import { COLLECTIONS } from '../constants/collections';
import { ROLES } from '../constants/roles';
import { PAGE_SIZE } from '../constants/config';

function getCurrentUserId() {
  return auth?.currentUser?.uid || null;
}

async function getCurrentUserProfile() {
  const uid = getCurrentUserId();
  if (!uid) return { role: ROLES.USER, empresaId: null };

  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return { role: ROLES.USER, empresaId: null };

  const data = snap.data();
  return { role: data?.role || ROLES.USER, empresaId: data?.empresaId || null };
}

export async function getCurrentUserRole() {
  const { role } = await getCurrentUserProfile();
  return role;
}

export function buildInventoryHistoryQuery({
  role,
  uid,
  empresaId,
  cursor = null,
  pageSize = PAGE_SIZE,
}) {
  if (!uid) throw new Error('Usuário não autenticado.');

  const buildQuery = constraints =>
    cursor
      ? query(
          collection(db, COLLECTIONS.INVENTORY),
          ...constraints,
          startAfter(cursor),
          limit(pageSize),
        )
      : query(
          collection(db, COLLECTIONS.INVENTORY),
          ...constraints,
          limit(pageSize),
        );

  if (role === ROLES.SUPER_ADMIN) {
    return buildQuery([orderBy('createdAt', 'desc')]);
  }

  if (role === ROLES.ADMIN && empresaId) {
    return buildQuery([
      where('empresaId', '==', empresaId),
      orderBy('createdAt', 'desc'),
    ]);
  }

  return buildQuery([
    where('usuarioId', '==', uid),
    orderBy('createdAt', 'desc'),
  ]);
}

export async function subscribeInventoryHistory({ onData, onError }) {
  const uid = getCurrentUserId();

  if (!uid) {
    onData?.([], ROLES.USER, null, false);
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
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      const hasMore = snapshot.docs.length === PAGE_SIZE;
      onData?.(list, role, lastDoc, hasMore);
    },
    error => onError?.(error),
  );

  return unsubscribe;
}

/** Busca a próxima página (one-shot, sem real-time) */
export async function fetchNextInventoryPage({ cursor, role, uid, empresaId }) {
  if (!cursor) return { items: [], lastDoc: null, hasMore: false };

  const q = buildInventoryHistoryQuery({ role, uid, empresaId, cursor });
  const snapshot = await getDocs(q);

  const items = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  const hasMore = snapshot.docs.length === PAGE_SIZE;

  return { items, lastDoc, hasMore };
}

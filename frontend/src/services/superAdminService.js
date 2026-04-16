import { db, auth } from '../config/firebaseConfig';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  where,
  limit,
  startAfter,
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

// ── Dataset — Curadoria para treino YOLO ─────────────────────────────────────

const PAGE_SIZE_DATASET = 20;

/**
 * Busca scans com foto para curadoria do dataset.
 * statusDataset: 'pendente' | 'validado' | 'rejeitado' | 'todos'
 */
export const getScansParaDataset = async (
  statusDataset = 'pendente',
  lastDoc = null,
) => {
  await assertSuperAdmin();

  let q = query(
    collection(db, COLLECTIONS.INVENTORY),
    where('fotoUrl', '!=', ''),
    orderBy('fotoUrl'),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE_DATASET),
  );

  if (statusDataset !== 'todos') {
    q = query(
      collection(db, COLLECTIONS.INVENTORY),
      where('fotoUrl', '!=', ''),
      where('statusDataset', '==', statusDataset),
      orderBy('fotoUrl'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE_DATASET),
    );
  }

  if (lastDoc) q = query(q, startAfter(lastDoc));

  const snap = await getDocs(q);
  return {
    items: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === PAGE_SIZE_DATASET,
  };
};

/**
 * Retorna contadores por status para o painel do dataset.
 */
export const getDatasetStats = async () => {
  await assertSuperAdmin();

  const [withPhoto, validados, rejeitados] = await Promise.all([
    getDocs(
      query(collection(db, COLLECTIONS.INVENTORY), where('fotoUrl', '!=', '')),
    ),
    getDocs(
      query(
        collection(db, COLLECTIONS.INVENTORY),
        where('statusDataset', '==', 'validado'),
      ),
    ),
    getDocs(
      query(
        collection(db, COLLECTIONS.INVENTORY),
        where('statusDataset', '==', 'rejeitado'),
      ),
    ),
  ]);

  const total = withPhoto.size;
  const nValidados = validados.size;
  const nRejeitados = rejeitados.size;
  const nPendentes = total - nValidados - nRejeitados;

  return {
    total,
    pendentes: nPendentes,
    validados: nValidados,
    rejeitados: nRejeitados,
  };
};

/**
 * Valida um scan: salva os labels aprovados e marca como validado.
 * labelsValidados: [{ label, bbox, confidence, source }]
 */
export const validarScan = async (docId, labelsValidados) => {
  await assertSuperAdmin();
  const uid = auth?.currentUser?.uid;
  await updateDoc(doc(db, COLLECTIONS.INVENTORY, docId), {
    statusDataset: 'validado',
    labelsValidados,
    validadoPor: uid,
    validadoEm: serverTimestamp(),
  });
};

/**
 * Rejeita um scan — não será usado no dataset de treino.
 */
export const rejeitarScan = async docId => {
  await assertSuperAdmin();
  const uid = auth?.currentUser?.uid;
  await updateDoc(doc(db, COLLECTIONS.INVENTORY, docId), {
    statusDataset: 'rejeitado',
    labelsValidados: [],
    validadoPor: uid,
    validadoEm: serverTimestamp(),
  });
};

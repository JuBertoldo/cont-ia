/**
 * Serviço de inventário (coleção /inventario).
 *
 * Gerencia a criação e leitura em tempo real de registros de contagem.
 * Toda escrita inclui automaticamente o `empresaId` do usuário logado,
 * garantindo o isolamento entre empresas definido nas regras do Firestore.
 */
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

/**
 * Salva um novo registro de contagem no Firestore.
 * Injeta automaticamente `empresaId` e timestamps de criação/atualização.
 *
 * @param {object} data - Dados do scan (detections, usuarioId, GPS, fotoUrl, etc.)
 * @returns {Promise<string>} ID do documento criado
 */
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

/**
 * Assina em tempo real os registros de inventário de um usuário específico.
 * Retorna os primeiros PAGE_SIZE registros, ordenados do mais recente ao mais antigo.
 *
 * @param {string} uid - UID do usuário
 * @param {(items: object[]) => void} callback - Chamado com a lista atualizada
 * @param {(error: Error) => void} onError - Chamado em caso de erro no listener
 * @returns {() => void} Função de cleanup (unsubscribe)
 */
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

/**
 * Permite que um Admin conteste a contagem de OUTRO usuário da empresa.
 * Um usuário nunca pode contestar sua própria contagem.
 *
 * @param {string} docId - ID do documento em /inventario
 * @param {string} contestReason - Justificativa da contestação
 * @param {string} ownerUid - UID do usuário que fez a contagem original
 * @throws {Error} Se não autenticado ou se tentar contestar a própria contagem
 */
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

/**
 * Assina em tempo real todos os registros de inventário de uma empresa.
 * Se `empresaId` for null/undefined, retorna todos os registros (Super Admin).
 *
 * @param {string | null} empresaId - ID da empresa (null = todas as empresas)
 * @param {(items: object[]) => void} callback - Chamado com a lista atualizada
 * @param {(error: Error) => void} onError - Chamado em caso de erro no listener
 * @returns {() => void} Função de cleanup (unsubscribe)
 */
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

import { db } from '../config/firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { COLLECTIONS } from '../constants/collections';

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const createEmpresa = async (nomeEmpresa, adminUid) => {
  let codigo;
  let exists = true;

  while (exists) {
    codigo = generateCode();
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.COMPANIES),
        where('codigo', '==', codigo),
      ),
    );
    exists = !snap.empty;
  }

  const empresaRef = doc(collection(db, COLLECTIONS.COMPANIES));
  await setDoc(empresaRef, {
    nome: nomeEmpresa,
    codigo,
    adminUid,
    createdAt: serverTimestamp(),
  });

  return { id: empresaRef.id, codigo };
};

export const getEmpresaByCodigo = async codigo => {
  const q = query(
    collection(db, COLLECTIONS.COMPANIES),
    where('codigo', '==', codigo.trim().toUpperCase()),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

export const getEmpresaById = async empresaId => {
  const snap = await getDoc(doc(db, COLLECTIONS.COMPANIES, empresaId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

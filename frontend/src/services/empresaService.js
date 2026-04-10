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

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const createEmpresa = async (nomeEmpresa, adminUid) => {
  let codigo;
  let exists = true;

  // Garante código único
  while (exists) {
    codigo = generateCode();
    const snap = await getDocs(
      query(collection(db, 'empresas'), where('codigo', '==', codigo)),
    );
    exists = !snap.empty;
  }

  const empresaRef = doc(collection(db, 'empresas'));
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
    collection(db, 'empresas'),
    where('codigo', '==', codigo.trim().toUpperCase()),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

export const getEmpresaById = async empresaId => {
  const snap = await getDoc(doc(db, 'empresas', empresaId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

import { auth, db } from '../config/firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

export const TICKET_TYPES = [
  { key: 'problema', label: 'Problema / Bug', icon: 'bug-outline' },
  { key: 'sugestao', label: 'Sugestão de melhoria', icon: 'bulb-outline' },
  {
    key: 'configuracao',
    label: 'Configuração da empresa',
    icon: 'settings-outline',
  },
  { key: 'outro', label: 'Outro', icon: 'help-circle-outline' },
];

export const TICKET_STATUS = {
  aberto: { label: 'Aberto', color: '#3b82f6' },
  em_andamento: { label: 'Em andamento', color: '#f59e0b' },
  resolvido: { label: 'Resolvido', color: '#22c55e' },
};

// ── Gera ID do chamado no formato CONTIA-DDMMYY01 ────────────────────────────

function getDateKey() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`; // ex: "100426"
}

async function getNextTicketNumber() {
  const dateKey = getDateKey();
  const counterRef = doc(db, 'config', 'ticketCounter');

  let sequencial = 1;
  await runTransaction(db, async tx => {
    const snap = await tx.get(counterRef);
    const data = snap.exists() ? snap.data() : {};

    if (data.data === dateKey) {
      // Mesmo dia — incrementa
      sequencial = (data.count || 0) + 1;
    } else {
      // Novo dia — reinicia do 01
      sequencial = 1;
    }

    tx.set(counterRef, { data: dateKey, count: sequencial }, { merge: false });
  });

  const seq = String(sequencial).padStart(2, '0'); // ex: "01"
  return `CONTIA-${dateKey}${seq}`; // ex: "CONTIA-10042601"
}

// ── Admin: abre chamado ───────────────────────────────────────────────────────

export const createTicket = async ({ titulo, descricao, tipo }) => {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('Não autenticado.');

  const userSnap = await getDoc(doc(db, 'usuarios', uid));
  if (!userSnap.exists()) throw new Error('Perfil não encontrado.');
  const userData = userSnap.data();

  let empresaNome = '';
  if (userData.empresaId) {
    const empSnap = await getDoc(doc(db, 'empresas', userData.empresaId));
    if (empSnap.exists()) empresaNome = empSnap.data().nome || '';
  }

  const numero = await getNextTicketNumber();

  const ref = await addDoc(collection(db, 'chamados'), {
    numero, // ex: "0042"
    titulo: titulo.trim(),
    descricao: descricao.trim(),
    tipo,
    status: 'aberto',
    empresaId: userData.empresaId || '',
    empresaNome,
    adminId: uid,
    adminNome: userData.nome || userData.email || '',
    resposta: '',
    respondidoPor: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: ref.id, numero };
};

// Ordena chamados do mais recente para o mais antigo (client-side, sem índice)
function sortByDate(list) {
  return list.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
    const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
    return bTime - aTime;
  });
}

// ── Admin: acompanha chamados da empresa ──────────────────────────────────────

export const subscribeCompanyTickets = (empresaId, onData, onError) => {
  // Sem orderBy no Firestore → sem necessidade de índice composto
  const q = query(
    collection(db, 'chamados'),
    where('empresaId', '==', empresaId),
  );
  return onSnapshot(
    q,
    snap => onData(sortByDate(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    onError,
  );
};

// ── Super Admin: vê todos os chamados ────────────────────────────────────────

export const getAllTickets = async () => {
  const snap = await getDocs(collection(db, 'chamados'));
  return sortByDate(snap.docs.map(d => ({ id: d.id, ...d.data() })));
};

export const subscribeAllTickets = (onData, onError) => {
  return onSnapshot(
    collection(db, 'chamados'),
    snap => onData(sortByDate(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    onError,
  );
};

// ── Super Admin: responde / atualiza status ───────────────────────────────────

export const respondTicket = async (ticketId, { status, resposta }) => {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('Não autenticado.');

  const userSnap = await getDoc(doc(db, 'usuarios', uid));
  const nome = userSnap.exists() ? userSnap.data().nome || '' : '';

  await updateDoc(doc(db, 'chamados', ticketId), {
    status,
    resposta: resposta?.trim() || '',
    respondidoPor: nome,
    updatedAt: serverTimestamp(),
  });
};

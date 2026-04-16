import { auth, db } from '../config/firebaseConfig';
import { apiClient } from './apiClient';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
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
  aguardando_cliente: { label: 'Aguardando cliente', color: '#8b5cf6' },
  resolvido: { label: 'Resolvido', color: '#22c55e' },
};

/** Transições de status permitidas */
export const TICKET_TRANSITIONS = {
  aberto: ['em_andamento'],
  em_andamento: ['aguardando_cliente', 'resolvido'],
  aguardando_cliente: ['em_andamento'],
  resolvido: ['aberto'],
};

/** SLA por tipo de chamado (em horas) */
export const TICKET_SLA = {
  problema: {
    prioridade: 'Alta',
    prioridadeColor: '#ef4444',
    respostaSuporteH: 2,
    resolucaoH: 12,
    respostaClienteH: 4,
  },
  configuracao: {
    prioridade: 'Média',
    prioridadeColor: '#f59e0b',
    respostaSuporteH: 4,
    resolucaoH: 48,
    respostaClienteH: 8,
  },
  sugestao: {
    prioridade: 'Baixa',
    prioridadeColor: '#22c55e',
    respostaSuporteH: 24,
    resolucaoH: 720,
    respostaClienteH: 48,
  },
  outro: {
    prioridade: 'Média',
    prioridadeColor: '#f59e0b',
    respostaSuporteH: 8,
    resolucaoH: 72,
    respostaClienteH: 24,
  },
};

/** Calcula info do SLA a partir de um deadline (Timestamp ou Date) */
export function getSlaInfo(deadline) {
  if (!deadline) return null;
  const d = deadline?.toDate ? deadline.toDate() : new Date(deadline);
  const msLeft = d - Date.now();
  const hLeft = msLeft / 3_600_000;

  if (msLeft <= 0)
    return { status: 'vencido', color: '#ef4444', label: 'Vencido' };
  if (hLeft < 1)
    return {
      status: 'critico',
      color: '#f97316',
      label: `${Math.ceil(hLeft * 60)}min restantes`,
    };
  if (hLeft < 4)
    return {
      status: 'atencao',
      color: '#f59e0b',
      label: `${Math.floor(hLeft)}h ${Math.round(
        (hLeft % 1) * 60,
      )}min restantes`,
    };
  return {
    status: 'ok',
    color: '#22c55e',
    label: `${Math.floor(hLeft)}h restantes`,
  };
}

function addHours(h) {
  return Timestamp.fromDate(new Date(Date.now() + h * 3_600_000));
}

// ── Gera ID do chamado no formato CONTIA-DDMMYY01 ────────────────────────────

function getDateKey() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

async function getNextTicketNumber() {
  const dateKey = getDateKey();
  const counterRef = doc(db, 'config', 'ticketCounter');

  let sequencial = 1;
  await runTransaction(db, async tx => {
    const snap = await tx.get(counterRef);
    const data = snap.exists() ? snap.data() : {};

    if (data.data === dateKey) {
      sequencial = (data.count || 0) + 1;
    } else {
      sequencial = 1;
    }

    tx.set(counterRef, { data: dateKey, count: sequencial }, { merge: false });
  });

  const seq = String(sequencial).padStart(2, '0');
  return `CONTIA-${dateKey}${seq}`;
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
  const sla = TICKET_SLA[tipo] ?? TICKET_SLA.outro;

  const ref = await addDoc(collection(db, 'chamados'), {
    numero,
    titulo: titulo.trim(),
    descricao: descricao.trim(),
    tipo,
    status: 'aberto',
    prioridade: sla.prioridade,
    prioridadeColor: sla.prioridadeColor,
    empresaId: userData.empresaId || '',
    empresaNome,
    adminId: uid,
    adminNome: userData.nome || userData.email || '',
    adminEmail: userData.email || '',
    resposta: '',
    respondidoPor: '',
    reaberturas: 0,
    // SLA deadlines
    slaRespostaSuporteAt: addHours(sla.respostaSuporteH),
    slaResolucaoAt: addHours(sla.resolucaoH),
    slaRespostaClienteAt: null,
    primeiraRespostaAt: null,
    resolvidoAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: ref.id, numero };
};

// Ordena chamados do mais recente para o mais antigo
function sortByDate(list) {
  return list.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
    const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
    return bTime - aTime;
  });
}

// ── Admin: acompanha chamados da empresa ──────────────────────────────────────

export const subscribeCompanyTickets = (empresaId, onData, onError) => {
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

// ── Super Admin / Support: vê todos os chamados ───────────────────────────────

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

// ── Support / Super Admin: atualiza status e responde ────────────────────────

export const respondTicket = async (ticketId, { status, resposta }) => {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('Não autenticado.');

  const userSnap = await getDoc(doc(db, 'usuarios', uid));
  const nome = userSnap.exists() ? userSnap.data().nome || '' : '';

  const ticketSnap = await getDoc(doc(db, 'chamados', ticketId));
  if (!ticketSnap.exists()) throw new Error('Chamado não encontrado.');
  const ticket = ticketSnap.data();

  const sla = TICKET_SLA[ticket.tipo] ?? TICKET_SLA.outro;

  const updates = {
    status,
    resposta: resposta?.trim() || ticket.resposta || '',
    respondidoPor: nome,
    updatedAt: serverTimestamp(),
  };

  // Primeira resposta do suporte
  if (!ticket.primeiraRespostaAt && status !== 'aberto') {
    updates.primeiraRespostaAt = serverTimestamp();
  }

  // Aguardando cliente → inicia SLA do cliente
  if (status === 'aguardando_cliente') {
    updates.slaRespostaClienteAt = addHours(sla.respostaClienteH);
  }

  // Resolvido → registra hora
  if (status === 'resolvido') {
    updates.resolvidoAt = serverTimestamp();
    updates.slaRespostaClienteAt = null;
  }

  // Reabertura → limpa resolvidoAt, incrementa contador
  if (status === 'aberto' && ticket.status === 'resolvido') {
    updates.resolvidoAt = null;
    updates.reaberturas = (ticket.reaberturas || 0) + 1;
    updates.slaResolucaoAt = addHours(sla.resolucaoH);
  }

  // Cliente respondeu → limpa SLA do cliente
  if (status === 'em_andamento' && ticket.status === 'aguardando_cliente') {
    updates.slaRespostaClienteAt = null;
  }

  await updateDoc(doc(db, 'chamados', ticketId), updates);

  // Notifica o admin por e-mail (falha silenciosa — não bloqueia o fluxo)
  if (ticket.adminEmail) {
    apiClient
      .post('/v1/notify/ticket', {
        numero: ticket.numero || ticketId,
        titulo: ticket.titulo || '',
        status,
        resposta: resposta?.trim() || '',
        admin_email: ticket.adminEmail,
        empresa_nome: ticket.empresaNome || '',
        respondido_por: nome || 'Suporte Cont.IA',
      })
      .catch(() => {});
  }
};

// ── Convites de suporte (/convites_suporte/{email}) ──────────────────────────

export const createSupportInvite = async ({ email, nome }) => {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('Não autenticado.');

  const emailKey = email.trim().toLowerCase();
  await setDoc(doc(db, 'convites_suporte', emailKey), {
    email: emailKey,
    nome: nome.trim(),
    createdBy: uid,
    usado: false,
    usadoEm: null,
    createdAt: serverTimestamp(),
  });
};

export const getSupportInvites = async () => {
  const snap = await getDocs(collection(db, 'convites_suporte'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteSupportInvite = async email => {
  await deleteDoc(doc(db, 'convites_suporte', email.toLowerCase()));
};

/** Valida e consome o convite durante o cadastro do técnico */
export const consumeSupportInvite = async email => {
  const emailKey = email.trim().toLowerCase();
  const inviteRef = doc(db, 'convites_suporte', emailKey);
  const snap = await getDoc(inviteRef);

  if (!snap.exists())
    throw new Error('Convite não encontrado para este e-mail.');
  if (snap.data().usado) throw new Error('Este convite já foi utilizado.');

  await updateDoc(inviteRef, {
    usado: true,
    usadoEm: serverTimestamp(),
  });

  return snap.data();
};

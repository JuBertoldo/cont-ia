/**
 * Serviço de operações do sistema de chamados (Support).
 *
 * Responsabilidade: operações no Firestore (criar, responder, assinar chamados,
 * gerenciar convites de suporte). Constantes e utilitários de SLA estão em
 * src/constants/supportConstants.js (importáveis sem dependência de rede).
 */
import { auth, db } from '../config/firebaseConfig';
import { apiClient } from './apiClient';
import {
  criarNotificacao,
  criarNotificacaoParaRole,
  NOTIF_TIPOS,
} from './notificationService';
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
} from 'firebase/firestore';
import {
  addHours,
  getSlaInfo,
  TICKET_SLA,
  TICKET_STATUS,
  TICKET_TRANSITIONS,
  TICKET_TYPES,
} from '../constants/supportConstants';

// Re-exporta para não quebrar imports existentes nas telas
export {
  getSlaInfo,
  TICKET_SLA,
  TICKET_STATUS,
  TICKET_TRANSITIONS,
  TICKET_TYPES,
};

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

  // Notifica todos os Support + Super Admin sobre o novo chamado
  Promise.all([
    criarNotificacaoParaRole(
      'support',
      NOTIF_TIPOS.CHAMADO_ABERTO,
      `Novo chamado ${numero}`,
      `${empresaNome} abriu: ${titulo.trim()}`,
      { ticketId: ref.id, numero, rota: 'SupportTickets' },
    ),
    criarNotificacaoParaRole(
      'super_admin',
      NOTIF_TIPOS.CHAMADO_ABERTO,
      `Novo chamado ${numero}`,
      `${empresaNome} abriu: ${titulo.trim()}`,
      { ticketId: ref.id, numero, rota: 'SupportTickets' },
    ),
  ]).catch(() => {});

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

  // Notifica o admin via sininho in-app
  if (ticket.adminId) {
    const _STATUS_LABELS = {
      em_andamento: 'Em andamento',
      aguardando_cliente: 'Aguardando sua resposta',
      resolvido: 'Resolvido ✓',
      aberto: 'Reaberto',
    };
    criarNotificacao(
      ticket.adminId,
      resposta?.trim()
        ? NOTIF_TIPOS.TICKET_RESPONDIDO
        : NOTIF_TIPOS.TICKET_ATUALIZADO,
      `Chamado ${ticket.numero} — ${_STATUS_LABELS[status] ?? status}`,
      resposta?.trim()
        ? `${nome || 'Suporte'}: ${resposta.trim()}`
        : `Status atualizado para "${_STATUS_LABELS[status] ?? status}"`,
      { ticketId, numero: ticket.numero, rota: 'Support' },
    ).catch(() => {});
  }

  // Notifica o admin por e-mail + push notification (falha silenciosa)
  if (ticket.adminEmail) {
    // Busca token FCM do admin no Firestore para push notification
    let fcmToken = '';
    try {
      const adminSnap = await getDoc(doc(db, 'usuarios', ticket.adminId));
      fcmToken = adminSnap.exists() ? adminSnap.data()?.fcmToken || '' : '';
    } catch (_) {}

    apiClient
      .post('/v1/notify/ticket', {
        numero: ticket.numero || ticketId,
        titulo: ticket.titulo || '',
        status,
        resposta: resposta?.trim() || '',
        admin_email: ticket.adminEmail,
        admin_fcm_token: fcmToken,
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

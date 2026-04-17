/**
 * Cont.IA — Serviço de Notificações
 *
 * Duas camadas:
 * 1. In-app (sininho): Firestore /notificacoes — sempre ativo, persiste entre sessões
 * 2. Push: @react-native-firebase/messaging — usuário ativa no Perfil
 *
 * Pendente (manual — feito uma única vez no Firebase Console + Xcode):
 *   iOS: Adicionar "Push Notifications" capability no Xcode
 *        + upload APNs Key (.p8) em Firebase Console → Configurações → Cloud Messaging
 *   Android: funciona automaticamente (google-services.json já configurado)
 */

import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  limit,
  orderBy,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { COLLECTIONS } from '../constants/collections';
import { ROLES } from '../constants/roles';
import logger from '../utils/logger';

// ── Tipos de notificação ──────────────────────────────────────────────────────

export const NOTIF_TIPOS = {
  NOVO_USUARIO: 'novo_usuario',
  CHAMADO_ABERTO: 'chamado_aberto',
  TICKET_ATUALIZADO: 'ticket_atualizado',
  TICKET_RESPONDIDO: 'ticket_respondido',
};

// ── Criar notificação ─────────────────────────────────────────────────────────

/**
 * Cria uma notificação in-app para um usuário específico.
 */
export async function criarNotificacao(
  paraUid,
  tipo,
  titulo,
  corpo,
  dados = {},
) {
  if (!paraUid) return;
  try {
    await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
      paraUid,
      tipo,
      titulo,
      corpo,
      dados,
      lida: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    logger.warning('Erro ao criar notificação: %s', error);
  }
}

/**
 * Cria notificações para todos os usuários de uma role específica.
 * Útil para notificar todos os Support quando um ticket é aberto.
 */
export async function criarNotificacaoParaRole(
  role,
  tipo,
  titulo,
  corpo,
  dados = {},
) {
  try {
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.USERS), where('role', '==', role)),
    );
    const batch = writeBatch(db);
    snap.docs.forEach(userDoc => {
      const ref = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
      batch.set(ref, {
        paraUid: userDoc.id,
        tipo,
        titulo,
        corpo,
        dados,
        lida: false,
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    logger.warning('Erro ao criar notificações por role: %s', error);
  }
}

/**
 * Cria notificações para todos os admins de uma empresa.
 * Usado quando um novo usuário fica pendente de aprovação.
 */
export async function criarNotificacaoParaAdminsEmpresa(
  empresaId,
  tipo,
  titulo,
  corpo,
  dados = {},
) {
  if (!empresaId) return;
  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.USERS),
        where('empresaId', '==', empresaId),
        where('role', '==', ROLES.ADMIN),
        where('status', '==', 'active'),
      ),
    );
    const batch = writeBatch(db);
    snap.docs.forEach(userDoc => {
      const ref = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
      batch.set(ref, {
        paraUid: userDoc.id,
        tipo,
        titulo,
        corpo,
        dados,
        lida: false,
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    logger.warning('Erro ao criar notificações para admins: %s', error);
  }
}

// ── Ler / gerenciar notificações ──────────────────────────────────────────────

/**
 * Escuta em tempo real as notificações do usuário (não lidas primeiro).
 * Retorna função de unsubscribe.
 */
export function subscribeNotificacoes(uid, onData, onError) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('paraUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  return onSnapshot(
    q,
    snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

/**
 * Escuta apenas a contagem de não lidas (para o badge do sininho).
 */
export function subscribeContadorNaoLidas(uid, onChange) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('paraUid', '==', uid),
    where('lida', '==', false),
  );
  return onSnapshot(
    q,
    snap => onChange(snap.size),
    () => onChange(0),
  );
}

export async function marcarComoLida(notifId) {
  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notifId), { lida: true });
}

export async function marcarTodasComoLidas(uid) {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('paraUid', '==', uid),
      where('lida', '==', false),
    ),
  );
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { lida: true }));
  await batch.commit();
}

// ── Push Notifications ────────────────────────────────────────────────────────

/**
 * Solicita permissão de push ao sistema operacional e salva o token FCM.
 * Chamado quando o usuário ativa o toggle no Perfil.
 * iOS: exibe o popup nativo "Deseja receber notificações?"
 * Android 13+: solicita POST_NOTIFICATIONS automaticamente.
 */
/**
 * Ativa push notifications — requer @react-native-firebase/messaging
 * e chave APNs no Firebase Console (stand-by até Apple Developer).
 * As notificações in-app (sininho) funcionam sem este setup.
 */
export async function ativarPushNotifications() {
  logger.debug('Push notifications: aguardando APNs key (Apple Developer).');
  return false;
}

export function configurarListenersPush(_onNotificacao) {
  return () => {};
}

export async function desativarPushNotifications() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await salvarTokenFCM(uid, '', false);
}

async function salvarTokenFCM(uid, token, habilitado) {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    fcmToken: token,
    fcmPlatform: Platform.OS,
    notificacoesHabilitadas: habilitado,
  });
}

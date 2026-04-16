/**
 * Cont.IA — Serviço de Notificações
 *
 * Duas camadas:
 * 1. In-app (sininho): Firestore /notificacoes — sempre ativo, persiste entre sessões
 * 2. Push (opcional): @react-native-firebase/messaging — usuário pode habilitar
 *
 * SETUP PUSH (opcional — uma única vez):
 *   npm install @react-native-firebase/app @react-native-firebase/messaging
 *   cd ios && pod install
 *   iOS: Adicionar "Push Notifications" capability no Xcode
 *       + upload APNs Key no Firebase Console → Cloud Messaging
 *   Android: funciona automaticamente com google-services.json
 *   Depois: descomentar os blocos marcados com "DESCOMENTAR APÓS INSTALAR"
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

// ── Push Notifications (opcional) ────────────────────────────────────────────

/**
 * Solicita permissão de push e salva o token FCM.
 * Chamar quando o usuário ativa o toggle nas configurações de perfil.
 *
 * DESCOMENTAR APÓS INSTALAR @react-native-firebase/messaging:
 */
export async function ativarPushNotifications() {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;

  try {
    // ── DESCOMENTAR APÓS INSTALAR @react-native-firebase/messaging ──────────
    // const messaging = (await import('@react-native-firebase/messaging')).default;
    // const status = await messaging().requestPermission();
    // const authorized =
    //   status === messaging.AuthorizationStatus.AUTHORIZED ||
    //   status === messaging.AuthorizationStatus.PROVISIONAL;
    // if (!authorized) return false;
    // const token = await messaging().getToken();
    // await salvarTokenFCM(uid, token, true);
    // messaging().onTokenRefresh(t => salvarTokenFCM(uid, t, true));
    // return true;

    // Placeholder até instalar o pacote:
    logger.debug(
      'Push: @react-native-firebase/messaging não instalado. Siga o README.',
    );
    await salvarTokenFCM(uid, '', true);
    return false;
  } catch (error) {
    logger.warning('Erro ao ativar push: %s', error);
    return false;
  }
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

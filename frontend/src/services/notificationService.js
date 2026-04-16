/**
 * Cont.IA — Serviço de Push Notifications (FCM)
 *
 * Usa @react-native-firebase/messaging para notificações nativas.
 *
 * SETUP NECESSÁRIO (uma única vez por plataforma):
 *
 * 1. Instalar o pacote nativo:
 *    cd frontend && npm install @react-native-firebase/app @react-native-firebase/messaging
 *    cd ios && pod install
 *
 * 2. iOS — Configurar APNs no Firebase Console:
 *    - Firebase Console → Projeto → Configurações → Cloud Messaging
 *    - Upload da APNs Authentication Key (.p8) ou Certificate (.p12)
 *    - Gerado em: developer.apple.com → Certificates, Identifiers & Profiles → Keys
 *    - Adicionar "Push Notifications" capability no Xcode (Signing & Capabilities)
 *
 * 3. Android — já funciona com google-services.json existente.
 *
 * 4. Descomentar o import de messaging abaixo e o código de inicialização.
 */

import { doc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import logger from '../utils/logger';

// ── Descomente após instalar @react-native-firebase/messaging ──────────────
// import messaging from '@react-native-firebase/messaging';

/**
 * Solicita permissão de notificações e salva o token FCM no Firestore.
 * Chamar uma vez após o login do usuário.
 */
export async function inicializarNotificacoes() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    // ── Descomentar após instalar @react-native-firebase/messaging ──────────
    /*
    const authStatus = await messaging().requestPermission();
    const authorized =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!authorized) {
      logger.info('Notificações: permissão negada pelo usuário.');
      return;
    }

    const token = await messaging().getToken();
    if (token) {
      await salvarTokenFCM(uid, token);
      logger.info('FCM token registrado | uid=%s platform=%s', uid, Platform.OS);
    }

    // Atualiza o token quando o FCM o rotaciona
    messaging().onTokenRefresh(async novoToken => {
      await salvarTokenFCM(uid, novoToken);
    });
    */

    logger.debug(
      'notificationService: @react-native-firebase/messaging não instalado ainda. ' +
        'Siga as instruções no topo deste arquivo.',
    );
  } catch (error) {
    logger.warning('Erro ao inicializar notificações: %s', error);
  }
}

/**
 * Configura listeners para notificações recebidas com o app aberto.
 * Retorna função de cleanup — chamar no useEffect de cleanup.
 */
export function configurarListeners() {
  // ── Descomentar após instalar @react-native-firebase/messaging ──────────
  /*
  // Notificação recebida com app em foreground
  const unsubForeground = messaging().onMessage(async remoteMessage => {
    logger.info('Notificação recebida (foreground):', remoteMessage);
    // Aqui você pode exibir um Alert ou snackbar customizado
    // Exemplo: Alert.alert(remoteMessage.notification?.title, remoteMessage.notification?.body);
  });

  // App aberto a partir de notificação (background → foreground)
  messaging().onNotificationOpenedApp(remoteMessage => {
    logger.info('App aberto via notificação:', remoteMessage);
    // Navegar para a tela de chamados se for uma notificação de ticket
    // navigation.navigate(ROUTES.SUPPORT_TICKETS);
  });

  // App estava fechado e foi aberto pela notificação
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        logger.info('App iniciado via notificação:', remoteMessage);
      }
    });

  return unsubForeground;
  */

  return () => {};
}

/**
 * Salva ou atualiza o token FCM no documento do usuário no Firestore.
 * Token salvo em /usuarios/{uid}/fcmToken — chamada dentro do bloco comentado acima.
 * @param {string} uid
 * @param {string} token
 */
export async function salvarTokenFCM(uid, token) {
  await updateDoc(doc(db, 'usuarios', uid), {
    fcmToken: token,
    fcmPlatform: Platform.OS,
  });
}

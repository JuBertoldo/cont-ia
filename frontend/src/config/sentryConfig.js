/**
 * Configuração do Sentry para o Cont.IA.
 * Captura erros em produção com contexto completo de dispositivo,
 * usuário e hardware — essencial para diagnosticar falhas do scanner
 * YOLO em diferentes celulares de campo em Manaus.
 */
import { Platform } from 'react-native';
import Config from 'react-native-config';

// Importa o Sentry real ou usa stub no-op (desenvolvimento sem módulo nativo)
let _sentry = null;
try {
  _sentry = require('@sentry/react-native');
} catch {
  // Módulo nativo não linkado — rode `pod install` (iOS) / gradle build (Android)
}

const _stub = {
  init: () => {},
  captureException: () => {},
  captureMessage: () => {},
  setUser: () => {},
  setTag: () => {},
  setContext: () => {},
  addBreadcrumb: () => {},
  withScope: cb =>
    cb({ setExtra: () => {}, setTag: () => {}, setLevel: () => {} }),
};

export const Sentry = _sentry ?? _stub;

/**
 * Inicializa o Sentry com contexto de plataforma e device.
 * Chame uma única vez em App.js antes de renderizar a árvore.
 */
export function initSentry() {
  if (!_sentry || !Config.SENTRY_DSN) return;

  _sentry.init({
    dsn: Config.SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 0 : 0.1,
    debug: false,

    beforeSend(event) {
      // Garante contexto de plataforma em todos os eventos
      event.contexts = {
        ...event.contexts,
        device: {
          ...event.contexts?.device,
          os_name: Platform.OS,
          os_version: String(Platform.Version),
        },
      };
      return event;
    },
  });

  Sentry.setTag('platform', Platform.OS);
  Sentry.setTag('os_version', String(Platform.Version));
}

/**
 * Identifica o usuário autenticado no Sentry.
 * Chame após login bem-sucedido.
 *
 * @param {{ uid: string, email: string, role: string, empresaId: string }} user
 */
export function setSentryUser({ uid, email, role, empresaId }) {
  Sentry.setUser({ id: uid, email });
  Sentry.setTag('role', role);
  Sentry.setTag('empresa_id', empresaId);
}

/**
 * Limpa o contexto de usuário no logout.
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Registra contexto de inferência YOLO.
 * Chame antes do scanner para que qualquer erro inclua dados de hardware.
 *
 * @param {{ deviceModel: string, inferenceMs?: number }} ctx
 */
export function setSentryInferenceContext({ deviceModel, inferenceMs = null }) {
  Sentry.setContext('yolo_inference', {
    device_model: deviceModel,
    os: Platform.OS,
    os_version: String(Platform.Version),
    inference_ms: inferenceMs,
  });
}

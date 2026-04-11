import Config from 'react-native-config';

// Usa require dinâmico para não crashar caso o módulo nativo não esteja linkado.
let _sentry = null;
try {
  _sentry = require('@sentry/react-native');
} catch (_) {
  // Módulo nativo ainda não linkado — rode pod install (iOS) / gradle build (Android).
}

export function initSentry() {
  if (!_sentry || !Config.SENTRY_DSN) return;
  _sentry.init({
    dsn: Config.SENTRY_DSN,
    tracesSampleRate: 0.2,
    environment: Config.NODE_ENV || 'development',
  });
}

// Exporta objeto real ou stub no-op para não quebrar o logger.
export const Sentry = _sentry ?? {
  captureException: () => {},
  captureMessage: () => {},
};

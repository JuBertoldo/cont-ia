import { Sentry } from '../config/sentryConfig';

/**
 * Logger estruturado para o Cont.IA.
 *
 * - Em desenvolvimento (__DEV__ === true): usa console.error/warn para visibilidade local.
 * - Em produção: captura erros no Sentry (requer SENTRY_DSN configurado no .env).
 */
const logger = {
  error(message, error, extras = {}) {
    if (__DEV__) {
      console.error(message, error);
      return;
    }
    if (error instanceof Error) {
      Sentry.captureException(error, { extra: { message, ...extras } });
    }
  },

  warn(message, ...args) {
    if (__DEV__) {
      console.warn(message, ...args);
    }
  },
};

export default logger;

import { Sentry } from '../config/sentryConfig';

/**
 * Logger estruturado do Cont.IA.
 *
 * - Desenvolvimento (__DEV__): console.error/warn para visibilidade local.
 * - Produção: captura no Sentry com contexto de dispositivo e breadcrumbs automáticos.
 */
const logger = {
  error(message, error, extras = {}) {
    if (__DEV__) {
      console.error('[ERROR]', message, error);
      return;
    }
    if (error instanceof Error) {
      Sentry.withScope(scope => {
        scope.setExtra('message', message);
        Object.entries(extras).forEach(([k, v]) => scope.setExtra(k, v));
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureMessage(
        `${message} — ${JSON.stringify(error ?? {})}`,
        'error',
      );
    }
  },

  warn(message, ...args) {
    if (__DEV__) {
      console.warn('[WARN]', message, ...args);
    }
    Sentry.addBreadcrumb({ category: 'warn', message, level: 'warning' });
  },

  info(message, ...args) {
    if (__DEV__) {
      console.warn('[INFO]', message, ...args);
    }
    Sentry.addBreadcrumb({ category: 'info', message, level: 'info' });
  },
};

export default logger;

import * as Sentry from '@sentry/react-native';
import Config from 'react-native-config';

export function initSentry() {
  if (!Config.SENTRY_DSN) return;
  Sentry.init({
    dsn: Config.SENTRY_DSN,
    tracesSampleRate: 0.2,
    environment: Config.NODE_ENV || 'development',
  });
}

export { Sentry };

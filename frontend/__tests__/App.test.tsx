/**
 * @format
 * Smoke test básico de renderização — complementa App.smoke.test.js
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/navigation/AppNavigator', () => {
  const { View } = require('react-native');
  return function MockAppNavigator() {
    return <View testID="app-navigator" />;
  };
});

jest.mock('../src/config/sentryConfig', () => ({
  initSentry: jest.fn(),
  Sentry: {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    setUser: jest.fn(),
    setTag: jest.fn(),
    setContext: jest.fn(),
    addBreadcrumb: jest.fn(),
    withScope: jest.fn(),
  },
}));

jest.mock('../src/services/offlineScanQueueService', () => ({
  startConnectivityListener: jest.fn(() => jest.fn()),
  syncPendingScans: jest.fn(),
  getPendingCount: jest.fn(() => Promise.resolve(0)),
  enqueue: jest.fn(),
}));

jest.mock('../src/services/scannerService', () => ({
  processScan: jest.fn(),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});

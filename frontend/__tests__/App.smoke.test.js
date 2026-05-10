/**
 * Smoke tests de inicialização do App.
 *
 * PROPÓSITO: detectar quebras de wiring — serviços criados mas não conectados,
 * imports de pacotes não instalados, listeners nunca iniciados.
 *
 * Esses testes falham ANTES de chegar ao dispositivo físico, economizando
 * ciclos de build de 10+ minutos no Xcode.
 *
 * Quando adicionar um novo serviço que precisa ser inicializado:
 *   1. Adicione o wiring no App.js (useEffect ou chamada direta)
 *   2. Adicione um teste aqui verificando que foi chamado
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ── Mocks de módulos nativos ─────────────────────────────────────────────────

jest.mock('../src/navigation/AppNavigator', () => {
  const { View } = require('react-native');
  return () => <View testID="app-navigator" />;
});

const mockInitSentry = jest.fn();
const mockStartListener = jest.fn(() => jest.fn());

jest.mock('../src/config/sentryConfig', () => ({
  initSentry: mockInitSentry,
  Sentry: {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    setUser: jest.fn(),
    setTag: jest.fn(),
    setContext: jest.fn(),
    addBreadcrumb: jest.fn(),
    withScope: jest.fn(cb => cb({ setExtra: jest.fn(), setTag: jest.fn() })),
  },
}));

jest.mock('../src/services/offlineScanQueueService', () => ({
  startConnectivityListener: mockStartListener,
  syncPendingScans: jest.fn(),
  getPendingCount: jest.fn(() => Promise.resolve(0)),
  enqueue: jest.fn(),
}));

const App = require('../App').default;

// ── Testes ──────────────────────────────────────────────────────────────────

describe('App — smoke tests de inicialização', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza sem lançar exceções', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it('inicializa o Sentry na montagem', () => {
    render(<App />);
    expect(mockInitSentry).toHaveBeenCalledTimes(1);
  });

  it('inicia o listener de conectividade na montagem', () => {
    render(<App />);
    expect(mockStartListener).toHaveBeenCalledTimes(1);
  });

  it('cancela o listener de conectividade ao desmontar (sem memory leak)', () => {
    const mockUnsubscribe = jest.fn();
    mockStartListener.mockReturnValueOnce(mockUnsubscribe);

    const { unmount } = render(<App />);
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

/**
 * Testes unitários — HistoryScreen
 * Cobre: renderização, estado vazio, cleanup de listener e callbacks.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../config/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'uid-123', displayName: 'Juliana' } },
  db: {},
}));

// Mocks definidos DENTRO do factory para evitar problema de hoisting
jest.mock('../../../services/historyService', () => ({
  subscribeInventoryHistory: jest.fn(),
  fetchNextInventoryPage: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../../services/authService', () => ({
  getUserProfile: jest.fn(() =>
    Promise.resolve({ role: 'user', empresaId: 'emp-1' }),
  ),
}));

jest.mock('../../../services/inventoryService', () => ({
  contestScan: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../services/ExportService', () => ({
  exportInventoryToCSV: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../utils/geocoding', () => ({
  reverseGeocode: jest.fn(() => Promise.resolve('Manaus, AM')),
}));

jest.mock('../../../utils/labelTranslation', () => ({
  translateLabel: jest.fn(label => label),
}));

jest.mock('../../../components/common/ImagePreviewModal', () => 'View');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

import HistoryScreen from '../HistoryScreen';
import { subscribeInventoryHistory } from '../../../services/historyService';

const MOCK_ITEM = {
  id: 'scan-1',
  item: 'bottle',
  quantidade: 3,
  totalGeral: 3,
  descricao: 'bottle: 3',
  itens: [{ label: 'bottle', quantidade: 3, confiancaMedia: 0.9 }],
  usuarioId: 'uid-123',
  usuarioNome: 'Juliana',
  local: 'Almoxarifado A',
  fotoUrl: 'https://storage.firebase.com/foto.jpg',
  origem: 'scanner',
  latitude: null,
  longitude: null,
  createdAt: { toDate: () => new Date('2026-05-15T10:00:00') },
};

const DEFAULT_PROPS = {
  route: { params: { filter: 'all', title: 'Histórico' } },
  navigation: { goBack: jest.fn(), navigate: jest.fn() },
};

// ── Testes ───────────────────────────────────────────────────────────────────

describe('HistoryScreen', () => {
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    subscribeInventoryHistory.mockImplementation(({ onData }) => {
      onData([MOCK_ITEM], 'user', null, false);
      return Promise.resolve(mockUnsubscribe);
    });
  });

  it('renderiza sem lançar exceções', () => {
    expect(() => render(<HistoryScreen {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('chama subscribeInventoryHistory na montagem', async () => {
    render(<HistoryScreen {...DEFAULT_PROPS} />);
    await waitFor(() => expect(subscribeInventoryHistory).toHaveBeenCalled(), {
      timeout: 3000,
    });
  });

  it('subscribeInventoryHistory recebe callbacks onData e onError', async () => {
    render(<HistoryScreen {...DEFAULT_PROPS} />);
    await waitFor(() => expect(subscribeInventoryHistory).toHaveBeenCalled(), {
      timeout: 3000,
    });
    const arg = subscribeInventoryHistory.mock.calls[0][0];
    expect(typeof arg.onData).toBe('function');
    expect(typeof arg.onError).toBe('function');
  });

  it('exibe estado vazio quando onData recebe lista vazia', async () => {
    subscribeInventoryHistory.mockImplementation(({ onData }) => {
      onData([], 'user', null, false);
      return Promise.resolve(mockUnsubscribe);
    });
    const { getByText } = render(<HistoryScreen {...DEFAULT_PROPS} />);
    await waitFor(
      () => expect(getByText('Nenhum item encontrado.')).toBeTruthy(),
      { timeout: 3000 },
    );
  });

  it('cancela o listener ao desmontar (sem memory leak)', async () => {
    const { unmount } = render(<HistoryScreen {...DEFAULT_PROPS} />);
    await waitFor(() => expect(subscribeInventoryHistory).toHaveBeenCalled(), {
      timeout: 3000,
    });
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

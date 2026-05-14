import {
  enqueue,
  getPendingCount,
  syncPendingScans,
  startConnectivityListener,
} from '../offlineScanQueueService';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage');

// Sem mock de @react-native-community/netinfo — não é mais usado no serviço.
// A detecção de conectividade usa fetch nativo (HEAD no /health do backend).

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: { YOLO_API_URL: 'http://localhost:8000' },
}));

global.fetch = jest.fn();

// processFunction é injetada como parâmetro — não há mais mock de scannerService aqui
const mockProcessScan = jest.fn();

const AsyncStorage = require('@react-native-async-storage/async-storage');

const SCAN_ARGS = {
  imageUri: 'file:///foto.jpg',
  usuarioId: 'uid-123',
  empresaId: 'emp-456',
  local: 'Almoxarifado A',
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

// ── enqueue ──────────────────────────────────────────────────────────────────

describe('enqueue', () => {
  it('salva o scan no AsyncStorage', async () => {
    await enqueue(SCAN_ARGS);
    const count = await getPendingCount();
    expect(count).toBe(1);
  });

  it('acumula múltiplos scans na fila', async () => {
    await enqueue(SCAN_ARGS);
    await enqueue({ ...SCAN_ARGS, local: 'Galpão B' });
    expect(await getPendingCount()).toBe(2);
  });

  it('adiciona _queuedAt ao item enfileirado', async () => {
    const before = Date.now();
    await enqueue(SCAN_ARGS);

    const raw = await AsyncStorage.getItem('@contia:offline_scan_queue');
    const queue = JSON.parse(raw);
    expect(queue[0]._queuedAt).toBeGreaterThanOrEqual(before);
  });

  it('preserva os args originais do scan', async () => {
    await enqueue(SCAN_ARGS);
    const raw = await AsyncStorage.getItem('@contia:offline_scan_queue');
    const queue = JSON.parse(raw);
    expect(queue[0].usuarioId).toBe(SCAN_ARGS.usuarioId);
    expect(queue[0].empresaId).toBe(SCAN_ARGS.empresaId);
  });

  it('NÃO salva imageBase64 na fila (previne estouro de memória no AsyncStorage)', async () => {
    const scanComBase64 = {
      ...SCAN_ARGS,
      imageBase64: 'data:image/jpeg;base64,' + 'A'.repeat(1000),
    };
    await enqueue(scanComBase64);
    const raw = await AsyncStorage.getItem('@contia:offline_scan_queue');
    const queue = JSON.parse(raw);
    expect(queue[0].imageBase64).toBeUndefined();
    expect(queue[0].imageUri).toBe(SCAN_ARGS.imageUri);
  });
});

// ── getPendingCount ───────────────────────────────────────────────────────────

describe('getPendingCount', () => {
  it('retorna 0 quando a fila está vazia', async () => {
    expect(await getPendingCount()).toBe(0);
  });

  it('retorna a quantidade correta de scans pendentes', async () => {
    await enqueue(SCAN_ARGS);
    await enqueue(SCAN_ARGS);
    expect(await getPendingCount()).toBe(2);
  });
});

// ── syncPendingScans ─────────────────────────────────────────────────────────

describe('syncPendingScans', () => {
  it('retorna { synced: 0, failed: 0 } quando a fila está vazia', async () => {
    const result = await syncPendingScans(mockProcessScan);
    expect(result).toEqual({ synced: 0, failed: 0 });
    expect(mockProcessScan).not.toHaveBeenCalled();
  });

  it('processa e remove scans bem-sucedidos da fila', async () => {
    mockProcessScan.mockResolvedValue({ success: true, id: 'doc-123' });
    await enqueue(SCAN_ARGS);
    await enqueue(SCAN_ARGS);

    const result = await syncPendingScans(mockProcessScan);

    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(await getPendingCount()).toBe(0);
  });

  it('mantém scans com falha na fila para próxima tentativa', async () => {
    mockProcessScan
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, message: 'Erro' });

    await enqueue(SCAN_ARGS);
    await enqueue({ ...SCAN_ARGS, local: 'Galpão B' });

    const result = await syncPendingScans(mockProcessScan);

    expect(result).toEqual({ synced: 1, failed: 1 });
    expect(await getPendingCount()).toBe(1);
  });

  it('mantém scan na fila quando processFunction lança exceção', async () => {
    mockProcessScan.mockRejectedValue(new Error('network error'));
    await enqueue(SCAN_ARGS);

    const result = await syncPendingScans(mockProcessScan);

    expect(result.failed).toBe(1);
    expect(await getPendingCount()).toBe(1);
  });

  it('chama processFunction sem o campo _queuedAt', async () => {
    mockProcessScan.mockResolvedValue({ success: true });
    await enqueue(SCAN_ARGS);

    await syncPendingScans(mockProcessScan);

    const callArgs = mockProcessScan.mock.calls[0][0];
    expect(callArgs._queuedAt).toBeUndefined();
    expect(callArgs.usuarioId).toBe(SCAN_ARGS.usuarioId);
  });
});

// ── startConnectivityListener ─────────────────────────────────────────────────

describe('startConnectivityListener', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retorna uma função de cleanup (cancela o intervalo)', () => {
    const unsubscribe = startConnectivityListener(mockProcessScan);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe(); // não deve lançar exceção
  });

  it('verifica conectividade a cada 30s via fetch HEAD no /health', async () => {
    global.fetch.mockResolvedValue({ ok: true });

    startConnectivityListener(mockProcessScan);
    jest.advanceTimersByTime(30_000);

    // Dá tempo para as promises resolverem
    await Promise.resolve();
    await Promise.resolve();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/health',
      expect.objectContaining({ method: 'HEAD' }),
    );
  });
});

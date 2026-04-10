import { processScan } from '../scannerService';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('../yoloService', () => ({
  detectWithYolo: jest.fn(),
  summarizeDetections: jest.fn(),
}));

jest.mock('../inventoryService', () => ({
  createInventoryItem: jest.fn(),
}));

global.fetch = jest.fn();
global.FileReader = jest.fn(() => ({
  readAsDataURL: jest.fn(),
  onloadend: null,
  onerror: null,
  result: 'data:image/jpeg;base64,dGVzdA==',
}));

import { detectWithYolo, summarizeDetections } from '../yoloService';
import { createInventoryItem } from '../inventoryService';

afterEach(() => {
  jest.clearAllMocks();
});

// ── processScan ───────────────────────────────────────────────────────────────

describe('processScan', () => {
  const defaultArgs = {
    imageBase64: 'dGVzdGltYWdl',
    usuarioId: 'uid-123',
    usuarioNome: 'João',
    usuarioRole: 'user',
    local: 'Estoque A',
    fotoUrl: 'https://storage.example.com/foto.jpg',
  };

  it('retorna sucesso com payload completo', async () => {
    detectWithYolo.mockResolvedValueOnce({
      detections: [
        { label: 'parafuso', confidence: 0.95, bbox: [0, 0, 100, 100] },
      ],
      meta: { model: 'yolo11m.pt', processing_ms: 50 },
    });

    summarizeDetections.mockReturnValueOnce({
      item: 'parafuso',
      classificacao: 'detecção yolo',
      quantidade: 1,
      repetidos: 0,
      descricao: 'Detectados: parafuso',
      labels: ['parafuso'],
    });

    createInventoryItem.mockResolvedValueOnce('doc-abc-123');

    const result = await processScan(defaultArgs);

    expect(result.success).toBe(true);
    expect(result.id).toBe('doc-abc-123');
    expect(result.payload.item).toBe('parafuso');
    expect(result.payload.scanId).toContain('uid-123');
    expect(result.payload.origem).toBe('scanner');
  });

  it('retorna falha se YOLO lançar exceção', async () => {
    detectWithYolo.mockRejectedValueOnce(
      new Error('Falha de conexão com a API YOLO.'),
    );

    const result = await processScan(defaultArgs);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Falha de conexão');
    expect(createInventoryItem).not.toHaveBeenCalled();
  });

  it('retorna falha se imagem não for fornecida', async () => {
    const result = await processScan({
      ...defaultArgs,
      imageBase64: null,
      imageUri: null,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Imagem não informada');
  });

  it('retorna falha se createInventoryItem lançar exceção', async () => {
    detectWithYolo.mockResolvedValueOnce({ detections: [], meta: {} });
    summarizeDetections.mockReturnValueOnce({
      item: 'não identificado',
      classificacao: 'indefinido',
      quantidade: 0,
      repetidos: 0,
      descricao: '',
      labels: [],
    });
    createInventoryItem.mockRejectedValueOnce(
      new Error('Firestore indisponível'),
    );

    const result = await processScan(defaultArgs);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Firestore');
  });

  it('chama detectWithYolo com o base64 correto', async () => {
    detectWithYolo.mockResolvedValueOnce({ detections: [], meta: {} });
    summarizeDetections.mockReturnValueOnce({
      item: 'x',
      classificacao: 'y',
      quantidade: 0,
      repetidos: 0,
      descricao: '',
      labels: [],
    });
    createInventoryItem.mockResolvedValueOnce('id-1');

    await processScan(defaultArgs);

    expect(detectWithYolo).toHaveBeenCalledWith(defaultArgs.imageBase64);
  });
});

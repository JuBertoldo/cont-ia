import { detectWithYolo, summarizeDetections } from '../yoloService';
import { apiClient } from '../apiClient';

// ── mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

afterEach(() => {
  jest.clearAllMocks();
});

// ── detectWithYolo ────────────────────────────────────────────────────────────

describe('detectWithYolo', () => {
  const validBase64 = 'aGVsbG93b3JsZA=='; // "helloworld"

  it('lança erro se imageBase64 for inválido', async () => {
    await expect(detectWithYolo('')).rejects.toThrow('Imagem inválida');
    await expect(detectWithYolo(null)).rejects.toThrow('Imagem inválida');
    await expect(detectWithYolo('abc')).rejects.toThrow('Imagem inválida');
  });

  it('retorna detecções normalizadas em resposta 200', async () => {
    apiClient.post.mockResolvedValueOnce({
      detections: [
        { label: 'parafuso', confidence: 0.95, bbox: [10, 20, 100, 200] },
      ],
      meta: { model: 'yolo11m.pt', processing_ms: 42 },
    });

    const result = await detectWithYolo(validBase64);

    expect(result.detections).toHaveLength(1);
    expect(result.detections[0].label).toBe('parafuso');
    expect(result.detections[0].confidence).toBe(0.95);
    expect(result.detections[0].bbox).toHaveLength(4);
    expect(result.meta.processing_ms).toBe(42);
  });

  it('chama apiClient.post com endpoint e payload corretos', async () => {
    apiClient.post.mockResolvedValueOnce({ detections: [], meta: {} });

    await detectWithYolo(validBase64);

    expect(apiClient.post).toHaveBeenCalledWith('/v1/detect', {
      image_base64: validBase64,
      source: 'mobile',
      platform: 'android',
    });
  });

  it('lança erro de timeout propagado do apiClient', async () => {
    apiClient.post.mockRejectedValueOnce(
      new Error('Tempo limite excedido na requisição.'),
    );

    await expect(detectWithYolo(validBase64)).rejects.toThrow(
      'Tempo limite excedido',
    );
  });

  it('lança erro de auth propagado do apiClient', async () => {
    apiClient.post.mockRejectedValueOnce(
      new Error('Token inválido ou expirado.'),
    );

    await expect(detectWithYolo(validBase64)).rejects.toThrow(
      'Token inválido ou expirado.',
    );
  });

  it('propaga erro genérico do apiClient', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Erro HTTP 500'));

    await expect(detectWithYolo(validBase64)).rejects.toThrow('Erro HTTP 500');
  });

  it('normaliza detecções com campos ausentes', async () => {
    apiClient.post.mockResolvedValueOnce({
      detections: [{ label: null, confidence: null, bbox: null }],
      meta: {},
    });

    const result = await detectWithYolo(validBase64);

    expect(result.detections[0].label).toBe('desconhecido');
    expect(result.detections[0].confidence).toBe(0);
    expect(result.detections[0].bbox).toEqual([]);
  });

  it('retorna detecções vazias se resposta não contiver array', async () => {
    apiClient.post.mockResolvedValueOnce({ detections: null, meta: {} });

    const result = await detectWithYolo(validBase64);

    expect(result.detections).toEqual([]);
  });
});

// ── summarizeDetections ───────────────────────────────────────────────────────

describe('summarizeDetections', () => {
  it('retorna resultado vazio para array vazio', () => {
    const result = summarizeDetections([]);
    expect(result.item).toBe('não identificado');
    expect(result.quantidade).toBe(0);
    expect(result.totalGeral).toBe(0);
    expect(result.itens).toEqual([]);
    expect(result.labels).toEqual([]);
  });

  it('retorna resultado vazio para input nulo', () => {
    const result = summarizeDetections(null);
    expect(result.item).toBe('não identificado');
  });

  it('identifica o item mais frequente como principal e retorna breakdown completo', () => {
    const detections = [
      { label: 'parafuso', confidence: 0.9, bbox: [] },
      { label: 'parafuso', confidence: 0.8, bbox: [] },
      { label: 'porca', confidence: 0.7, bbox: [] },
    ];
    const result = summarizeDetections(detections);
    expect(result.item).toBe('parafuso');
    expect(result.quantidade).toBe(3);
    expect(result.totalGeral).toBe(3);
    expect(result.itens).toHaveLength(2);
    expect(result.itens[0]).toMatchObject({ label: 'parafuso', quantidade: 2 });
    expect(result.itens[1]).toMatchObject({ label: 'porca', quantidade: 1 });
  });

  it('retorna quantidade total e lista de labels', () => {
    const detections = [
      { label: 'item_a', confidence: 0.9, bbox: [] },
      { label: 'item_b', confidence: 0.8, bbox: [] },
    ];
    const result = summarizeDetections(detections);
    expect(result.quantidade).toBe(2);
    expect(result.labels).toContain('item_a');
    expect(result.labels).toContain('item_b');
  });

  it('retorna classificacao correta', () => {
    const detections = [{ label: 'monitor', confidence: 0.91, bbox: [] }];
    const result = summarizeDetections(detections);
    expect(result.classificacao).toBe('detecção yolo');
  });
});

import { apiClient } from '../apiClient';

jest.mock('../authService', () => ({
  getIdToken: jest.fn(() => Promise.resolve('fake-token')),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Sucesso ──────────────────────────────────────────────────────────────────

describe('apiClient.post — sucesso', () => {
  it('retorna payload quando a resposta é 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ detections: [] }),
    });

    const result = await apiClient.post('/v1/detect', { image_base64: 'abc' });
    expect(result).toEqual({ detections: [] });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('envia Authorization Bearer com o token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiClient.post('/v1/detect', {});

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer fake-token');
  });

  it('envia Content-Type application/json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiClient.post('/v1/detect', { foo: 'bar' });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.body).toBe(JSON.stringify({ foo: 'bar' }));
  });
});

// ── Retry com backoff (usa timers reais — delay máx 1.5s) ────────────────────

describe('apiClient.post — retry com backoff', () => {
  it('retenta 3 vezes em erro de rede e lança após esgotar', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'));

    await expect(apiClient.post('/v1/detect', {})).rejects.toThrow(
      'network error',
    );
    expect(mockFetch).toHaveBeenCalledTimes(3);
  }, 8000);

  it('retenta em status 503 e sucede na segunda tentativa', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ detail: 'Service Unavailable' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });

    const result = await apiClient.post('/v1/detect', {});
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  }, 5000);

  it('NÃO retenta em erro 422 (erro de negócio) — falha imediata', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ detail: 'Imagem inválida' }),
    });

    await expect(apiClient.post('/v1/detect', {})).rejects.toThrow(
      'Imagem inválida',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('NÃO retenta em erro 403 — falha imediata', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ detail: 'Forbidden' }),
    });

    await expect(apiClient.post('/v1/detect', {})).rejects.toThrow('Forbidden');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retenta em status 500', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'Internal Server Error' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });

    const result = await apiClient.post('/v1/detect', {});
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  }, 5000);
});

// ── Renovação de token 401 ───────────────────────────────────────────────────

describe('apiClient.post — renovação de token 401', () => {
  it('faz forceRefresh do token em 401 e retenta', async () => {
    const { getIdToken } = require('../authService');

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });

    const result = await apiClient.post('/v1/detect', {});

    expect(result).toEqual({ ok: true });
    expect(getIdToken).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ── Sem URL configurada ──────────────────────────────────────────────────────

describe('apiClient.post — configuração', () => {
  it('lança erro imediato quando YOLO_API_URL está vazia', async () => {
    jest.resetModules();
    jest.doMock('react-native-config', () => ({
      default: { YOLO_API_URL: '' },
    }));

    const { apiClient: client } = require('../apiClient');
    await expect(client.post('/v1/detect', {})).rejects.toThrow('YOLO_API_URL');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

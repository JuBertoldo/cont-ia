import { renderHook, act } from '@testing-library/react-native';
import { useScanner } from '../useScanner';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../config/firebaseConfig', () => ({
  auth: {
    currentUser: {
      uid: 'user-123',
      displayName: 'Operador Teste',
    },
  },
}));

jest.mock('../../services/scannerService', () => ({
  processScan: jest.fn(),
}));

import { processScan } from '../../services/scannerService';

afterEach(() => {
  jest.clearAllMocks();
});

// ── useScanner ────────────────────────────────────────────────────────────────

describe('useScanner', () => {
  it('inicia com loading false', () => {
    const { result } = renderHook(() => useScanner());
    expect(result.current.loading).toBe(false);
  });

  it('chama processScan com os parâmetros corretos', async () => {
    processScan.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useScanner());

    await act(async () => {
      await result.current.scan('file:///foto.jpg');
    });

    expect(processScan).toHaveBeenCalledWith({
      imageUri: 'file:///foto.jpg',
      usuarioId: 'user-123',
      usuarioNome: 'Operador Teste',
      usuarioRole: 'user',
    });
  });

  it('lança erro se imageUri for nulo', async () => {
    const { result } = renderHook(() => useScanner());

    await expect(
      act(async () => {
        await result.current.scan(null);
      }),
    ).rejects.toThrow('Imagem inválida');
  });

  it('propaga erros de processScan e restaura loading=false', async () => {
    processScan.mockRejectedValueOnce(new Error('YOLO offline'));

    const { result } = renderHook(() => useScanner());

    await expect(
      act(async () => {
        await result.current.scan('file:///foto.jpg');
      }),
    ).rejects.toThrow('YOLO offline');

    expect(result.current.loading).toBe(false);
  });
});

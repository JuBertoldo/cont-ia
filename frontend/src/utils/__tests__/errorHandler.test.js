import { Alert } from 'react-native';
import {
  getErrorMessage,
  showErrorAlert,
  withErrorAlert,
} from '../errorHandler';

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getErrorMessage', () => {
  it('retorna fallback quando error é null', () => {
    expect(getErrorMessage(null)).toBe('Ocorreu um erro inesperado.');
  });

  it('retorna fallback customizado quando error é null', () => {
    expect(getErrorMessage(null, 'Erro customizado')).toBe('Erro customizado');
  });

  it('retorna a string diretamente quando error é string', () => {
    expect(getErrorMessage('Algo deu errado')).toBe('Algo deu errado');
  });

  it('retorna error.message quando error é objeto Error', () => {
    expect(getErrorMessage(new Error('Mensagem do erro'))).toBe(
      'Mensagem do erro',
    );
  });

  it('retorna fallback quando error.message é undefined', () => {
    expect(getErrorMessage({})).toBe('Ocorreu um erro inesperado.');
  });
});

describe('showErrorAlert', () => {
  it('chama Alert.alert com título Erro e mensagem extraída', () => {
    showErrorAlert(new Error('Falha na operação'));
    expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Falha na operação');
  });

  it('usa fallback quando error é null', () => {
    showErrorAlert(null, 'Fallback específico');
    expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Fallback específico');
  });
});

describe('withErrorAlert', () => {
  it('executa fn com sucesso sem chamar Alert', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    await withErrorAlert(fn);
    expect(fn).toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('exibe Alert quando fn lança exceção', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Erro de rede'));
    await withErrorAlert(fn);
    expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Erro de rede');
  });

  it('exibe Alert com fallback quando fn lança erro sem mensagem', async () => {
    const fn = jest.fn().mockRejectedValue({});
    await withErrorAlert(fn, 'Mensagem de fallback');
    expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Mensagem de fallback');
  });
});

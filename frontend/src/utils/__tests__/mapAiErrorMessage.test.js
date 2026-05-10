import { mapAiErrorMessage } from '../mapAiErrorMessage';

describe('mapAiErrorMessage', () => {
  it('retorna mensagem de crédito insuficiente', () => {
    const error = new Error('credit balance is too low to proceed');
    expect(mapAiErrorMessage(error)).toContain('limite de créditos');
  });

  it('retorna mensagem de autenticação inválida (invalid x-api-key)', () => {
    const error = new Error('invalid x-api-key provided');
    expect(mapAiErrorMessage(error)).toContain('autenticação');
  });

  it('retorna mensagem de autenticação inválida (authentication_error)', () => {
    const error = new Error('authentication_error occurred');
    expect(mapAiErrorMessage(error)).toContain('autenticação');
  });

  it('retorna mensagem de usuário não autenticado (unauthenticated)', () => {
    const error = new Error('unauthenticated request');
    expect(mapAiErrorMessage(error)).toContain('logado');
  });

  it('retorna mensagem de usuário não autenticado (usuário não autenticado)', () => {
    const error = new Error('usuário não autenticado');
    expect(mapAiErrorMessage(error)).toContain('logado');
  });

  it('retorna mensagem de rede para erros de network', () => {
    const error = new Error('network error');
    expect(mapAiErrorMessage(error)).toContain('internet');
  });

  it('retorna mensagem de rede para erros de connection', () => {
    const error = new Error('connection refused');
    expect(mapAiErrorMessage(error)).toContain('internet');
  });

  it('retorna mensagem genérica para erros desconhecidos', () => {
    const error = new Error('some unknown internal failure');
    expect(mapAiErrorMessage(error)).toContain('Não foi possível processar');
  });

  it('lida com error nulo retornando mensagem genérica', () => {
    expect(mapAiErrorMessage(null)).toContain('Não foi possível processar');
  });

  it('lida com error como objeto com details.message', () => {
    const error = { details: { message: 'credit balance is too low' } };
    expect(mapAiErrorMessage(error)).toContain('limite de créditos');
  });
});

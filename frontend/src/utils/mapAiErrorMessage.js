export function mapAiErrorMessage(error) {
  const raw =
    error?.message || error?.details?.message || JSON.stringify(error || {});

  const msg = String(raw).toLowerCase();

  if (msg.includes('credit balance is too low')) {
    return 'Serviço de IA temporariamente indisponível por limite de créditos. Tente novamente mais tarde.';
  }

  if (
    msg.includes('invalid x-api-key') ||
    msg.includes('authentication_error')
  ) {
    return 'Falha de autenticação do serviço de IA. Contate o suporte.';
  }

  if (
    msg.includes('unauthenticated') ||
    msg.includes('usuário não autenticado')
  ) {
    return 'Você precisa estar logado para continuar.';
  }

  if (msg.includes('network') || msg.includes('connection')) {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
  }

  return 'Não foi possível processar a auditoria agora. Tente novamente em instantes.';
}

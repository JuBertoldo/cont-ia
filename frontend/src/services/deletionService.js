/**
 * Serviço de exclusão de conta — LGPD art. 18, II.
 * Chama o endpoint backend que orquestra toda a remoção/anonimização.
 */
import { apiClient } from './apiClient';
import { logout } from './authService';
import logger from '../utils/logger';

/**
 * Solicita a exclusão completa da conta do usuário autenticado.
 *
 * O backend:
 *   - Deleta: perfil, notificações, métricas, foto de perfil, conta Firebase Auth
 *   - Anonimiza: registros de inventário e audit de login (obrigação fiscal)
 *   - Registra: evento de exclusão em /deletion_log sem dados pessoais
 *
 * @returns {{ success: boolean, deleted: object, anonymized: object, message: string }}
 */
export async function requestAccountDeletion() {
  try {
    const result = await apiClient.delete('/v1/user/account');
    logger.info('Conta excluída com sucesso via backend.');
    return { success: true, ...result };
  } catch (error) {
    logger.error('Erro ao solicitar exclusão de conta:', error);
    return {
      success: false,
      message:
        error?.message || 'Não foi possível excluir a conta. Tente novamente.',
    };
  } finally {
    // Faz logout local independente do resultado —
    // o token Firebase não é mais válido após a exclusão.
    try {
      await logout();
    } catch {
      // ignora erro de logout — conta pode já estar deletada
    }
  }
}

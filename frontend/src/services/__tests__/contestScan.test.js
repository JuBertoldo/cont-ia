/**
 * Testes das regras de negócio de contestação.
 * Cobre: quem pode contestar, o que pode ser contestado e quando é bloqueado.
 */
import { contestScan } from '../inventoryService';
import { ROLES } from '../../constants/roles';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUpdateDoc = jest.fn(async () => {});

jest.mock('../../config/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'admin-uid' } },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'colRef'),
  doc: jest.fn(() => 'docRef'),
  addDoc: jest.fn(async () => ({ id: 'new-id' })),
  getDoc: jest.fn(async () => ({
    exists: () => true,
    data: () => ({ empresaId: 'emp-1' }),
  })),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: jest.fn(() => 'queryRef'),
  where: jest.fn(() => 'whereClause'),
  orderBy: jest.fn(() => 'orderByClause'),
  onSnapshot: jest.fn(() => jest.fn()),
  limit: jest.fn(() => 'limitClause'),
  serverTimestamp: jest.fn(() => 'TIMESTAMP'),
}));

jest.mock('../../utils/userUtils', () => ({
  getCurrentEmpresaId: jest.fn(async () => 'emp-1'),
}));

afterEach(() => jest.clearAllMocks());

// ── Regras de contestação ─────────────────────────────────────────────────────

describe('contestScan — regras de negócio', () => {
  it('admin pode contestar scan de usuário comum', async () => {
    // admin-uid contesta scan de outro usuário (user-uid)
    await contestScan('scan-id', 'Quantidade incorreta', 'user-uid');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'docRef',
      expect.objectContaining({
        status: 'contested',
        contestReason: 'Quantidade incorreta',
        contestedBy: 'admin-uid',
      }),
    );
  });

  it('não permite contestar a própria contagem', async () => {
    // admin-uid tenta contestar scan de si mesmo
    await expect(contestScan('scan-id', 'Motivo', 'admin-uid')).rejects.toThrow(
      'Você não pode contestar sua própria contagem.',
    );
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('lança erro quando não há usuário autenticado', async () => {
    const firebaseConfig = require('../../config/firebaseConfig');
    const originalAuth = firebaseConfig.auth;
    firebaseConfig.auth = { currentUser: null };

    await expect(contestScan('scan-id', 'Motivo', 'outro-uid')).rejects.toThrow(
      'Não autenticado.',
    );
    expect(mockUpdateDoc).not.toHaveBeenCalled();

    firebaseConfig.auth = originalAuth;
  });
});

// ── Regras de exibição do botão Contestar (lógica de UI) ─────────────────────

describe('regras de exibição do botão Contestar', () => {
  /**
   * Simula a condição de exibição do botão Contestar conforme HistoryScreen.js.
   * Admin só vê o botão se:
   *  - Seu role é ADMIN
   *  - O item não é dele mesmo
   *  - O dono do item é usuário comum (role USER)
   *  - O item ainda não foi contestado
   */
  function canShowContestButton({
    currentUserRole,
    currentUserId,
    itemUserId,
    itemUserRole,
    itemStatus,
  }) {
    return (
      currentUserRole === ROLES.ADMIN &&
      itemUserId !== currentUserId &&
      itemUserRole === ROLES.USER &&
      itemStatus !== 'contested'
    );
  }

  it('exibe botão: admin contestando scan de user', () => {
    expect(
      canShowContestButton({
        currentUserRole: ROLES.ADMIN,
        currentUserId: 'admin-1',
        itemUserId: 'user-1',
        itemUserRole: ROLES.USER,
        itemStatus: 'normal',
      }),
    ).toBe(true);
  });

  it('oculta botão: admin NÃO pode contestar scan de outro admin', () => {
    expect(
      canShowContestButton({
        currentUserRole: ROLES.ADMIN,
        currentUserId: 'admin-1',
        itemUserId: 'admin-2',
        itemUserRole: ROLES.ADMIN,
        itemStatus: 'normal',
      }),
    ).toBe(false);
  });

  it('oculta botão: admin NÃO pode contestar scan de super_admin', () => {
    expect(
      canShowContestButton({
        currentUserRole: ROLES.ADMIN,
        currentUserId: 'admin-1',
        itemUserId: 'super-1',
        itemUserRole: ROLES.SUPER_ADMIN,
        itemStatus: 'normal',
      }),
    ).toBe(false);
  });

  it('oculta botão: admin NÃO pode contestar sua própria contagem', () => {
    expect(
      canShowContestButton({
        currentUserRole: ROLES.ADMIN,
        currentUserId: 'admin-1',
        itemUserId: 'admin-1',
        itemUserRole: ROLES.ADMIN,
        itemStatus: 'normal',
      }),
    ).toBe(false);
  });

  it('oculta botão: scan já contestado', () => {
    expect(
      canShowContestButton({
        currentUserRole: ROLES.ADMIN,
        currentUserId: 'admin-1',
        itemUserId: 'user-1',
        itemUserRole: ROLES.USER,
        itemStatus: 'contested',
      }),
    ).toBe(false);
  });

  it('oculta botão: user comum nunca vê o botão', () => {
    expect(
      canShowContestButton({
        currentUserRole: ROLES.USER,
        currentUserId: 'user-1',
        itemUserId: 'user-2',
        itemUserRole: ROLES.USER,
        itemStatus: 'normal',
      }),
    ).toBe(false);
  });

  it('oculta botão: super_admin não vê o botão (usa chamado)', () => {
    expect(
      canShowContestButton({
        currentUserRole: ROLES.SUPER_ADMIN,
        currentUserId: 'super-1',
        itemUserId: 'user-1',
        itemUserRole: ROLES.USER,
        itemStatus: 'normal',
      }),
    ).toBe(false);
  });
});

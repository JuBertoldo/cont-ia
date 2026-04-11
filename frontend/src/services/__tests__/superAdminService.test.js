import {
  getAllEmpresas,
  deleteEmpresa,
  getAllUsersGlobal,
  deleteUserGlobal,
  updateUserRoleGlobal,
  getAllScansGlobal,
  deleteScanGlobal,
} from '../superAdminService';
import { ROLES } from '../../constants/roles';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockDeleteDoc = jest.fn(async () => {});
const mockUpdateDoc = jest.fn(async () => {});

jest.mock('../../config/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'super-uid' } },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'colRef'),
  doc: jest.fn(() => 'docRef'),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: jest.fn(() => 'queryRef'),
  orderBy: jest.fn(() => 'orderByClause'),
  serverTimestamp: jest.fn(() => 'TIMESTAMP'),
}));

function makeSuperAdminSnap() {
  mockGetDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({ role: ROLES.SUPER_ADMIN }),
  });
}

function makeNonSuperAdminSnap(role = ROLES.ADMIN) {
  mockGetDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({ role }),
  });
}

afterEach(() => jest.clearAllMocks());

// ── assertSuperAdmin (via funções públicas) ───────────────────────────────────

describe('assertSuperAdmin — bloqueio de acesso', () => {
  it('lança erro se o usuário for admin (não super_admin)', async () => {
    makeNonSuperAdminSnap(ROLES.ADMIN);
    await expect(getAllEmpresas()).rejects.toThrow(
      'Acesso negado. Requer perfil super admin.',
    );
  });

  it('lança erro se o usuário for user', async () => {
    makeNonSuperAdminSnap(ROLES.USER);
    await expect(getAllEmpresas()).rejects.toThrow(
      'Acesso negado. Requer perfil super admin.',
    );
  });

  it('lança erro se não houver usuário autenticado', async () => {
    const firebaseConfig = require('../../config/firebaseConfig');
    const originalAuth = firebaseConfig.auth;
    firebaseConfig.auth = { currentUser: null };

    await expect(getAllEmpresas()).rejects.toThrow('Não autenticado.');

    firebaseConfig.auth = originalAuth;
  });
});

// ── getAllEmpresas ─────────────────────────────────────────────────────────────

describe('getAllEmpresas', () => {
  it('retorna lista de empresas para super_admin', async () => {
    makeSuperAdminSnap();
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { id: 'e1', data: () => ({ nome: 'Empresa A' }) },
        { id: 'e2', data: () => ({ nome: 'Empresa B' }) },
      ],
    });

    const result = await getAllEmpresas();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'e1', nome: 'Empresa A' });
  });
});

// ── deleteEmpresa ─────────────────────────────────────────────────────────────

describe('deleteEmpresa', () => {
  it('deleta empresa pelo id', async () => {
    makeSuperAdminSnap();
    await deleteEmpresa('empresa-id');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

// ── getAllUsersGlobal ──────────────────────────────────────────────────────────

describe('getAllUsersGlobal', () => {
  it('retorna todos os usuários globalmente', async () => {
    makeSuperAdminSnap();
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: 'u1', data: () => ({ nome: 'Ana', role: ROLES.USER }) }],
    });

    const result = await getAllUsersGlobal();
    expect(result).toHaveLength(1);
    expect(result[0].nome).toBe('Ana');
  });
});

// ── deleteUserGlobal ──────────────────────────────────────────────────────────

describe('deleteUserGlobal', () => {
  it('deleta usuário globalmente', async () => {
    makeSuperAdminSnap();
    await deleteUserGlobal('uid-alvo');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

// ── updateUserRoleGlobal ──────────────────────────────────────────────────────

describe('updateUserRoleGlobal', () => {
  it('atualiza role para admin', async () => {
    makeSuperAdminSnap();
    await updateUserRoleGlobal('uid-1', ROLES.ADMIN);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'docRef',
      expect.objectContaining({ role: ROLES.ADMIN }),
    );
  });

  it('atualiza role para super_admin', async () => {
    makeSuperAdminSnap();
    await updateUserRoleGlobal('uid-1', ROLES.SUPER_ADMIN);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'docRef',
      expect.objectContaining({ role: ROLES.SUPER_ADMIN }),
    );
  });

  it('lança erro para role inválido', async () => {
    makeSuperAdminSnap();
    await expect(updateUserRoleGlobal('uid-1', 'deus')).rejects.toThrow(
      'Role inválido.',
    );
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// ── getAllScansGlobal ─────────────────────────────────────────────────────────

describe('getAllScansGlobal', () => {
  it('retorna todos os scans globalmente', async () => {
    makeSuperAdminSnap();
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: 's1', data: () => ({ item: 'parafuso' }) }],
    });

    const result = await getAllScansGlobal();
    expect(result[0]).toMatchObject({ id: 's1', item: 'parafuso' });
  });
});

// ── deleteScanGlobal ──────────────────────────────────────────────────────────

describe('deleteScanGlobal', () => {
  it('deleta scan pelo id', async () => {
    makeSuperAdminSnap();
    await deleteScanGlobal('scan-id');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

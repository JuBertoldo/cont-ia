import {
  getAllUsers,
  approveUser,
  rejectUser,
  updateUserRole,
} from '../adminService';
import { ROLES } from '../../constants/roles';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../config/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'admin-uid' } },
  db: {},
}));

const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn(async () => {});

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'colRef'),
  doc: jest.fn(() => 'docRef'),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: jest.fn(() => 'queryRef'),
  where: jest.fn(() => 'whereClause'),
  orderBy: jest.fn(() => 'orderByClause'),
  serverTimestamp: jest.fn(() => 'TIMESTAMP'),
}));

jest.mock('../../utils/userUtils', () => ({
  getCurrentEmpresaId: jest.fn(async () => 'empresa-123'),
}));

afterEach(() => jest.clearAllMocks());

// ── getAllUsers ────────────────────────────────────────────────────────────────

describe('getAllUsers', () => {
  it('retorna lista de usuários da empresa', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { id: 'u1', data: () => ({ nome: 'Alice', role: ROLES.USER }) },
        { id: 'u2', data: () => ({ nome: 'Bob', role: ROLES.ADMIN }) },
      ],
    });

    const users = await getAllUsers();
    expect(users).toHaveLength(2);
    expect(users[0]).toMatchObject({ id: 'u1', nome: 'Alice' });
  });

  it('retorna lista vazia quando não há usuários', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    const users = await getAllUsers();
    expect(users).toEqual([]);
  });
});

// ── approveUser ───────────────────────────────────────────────────────────────

describe('approveUser', () => {
  it('atualiza status para "active"', async () => {
    await approveUser('uid-1');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'docRef',
      expect.objectContaining({ status: 'active' }),
    );
  });
});

// ── rejectUser ────────────────────────────────────────────────────────────────

describe('rejectUser', () => {
  it('atualiza status para "rejected"', async () => {
    await rejectUser('uid-1');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'docRef',
      expect.objectContaining({ status: 'rejected' }),
    );
  });
});

// ── updateUserRole ────────────────────────────────────────────────────────────

describe('updateUserRole', () => {
  it('atualiza role para admin', async () => {
    await updateUserRole('uid-1', ROLES.ADMIN);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'docRef',
      expect.objectContaining({ role: ROLES.ADMIN }),
    );
  });

  it('atualiza role para user', async () => {
    await updateUserRole('uid-1', ROLES.USER);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'docRef',
      expect.objectContaining({ role: ROLES.USER }),
    );
  });

  it('lança erro para role inválido', async () => {
    await expect(updateUserRole('uid-1', ROLES.SUPER_ADMIN)).rejects.toThrow(
      'Role inválido.',
    );
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('lança erro para string de role desconhecida', async () => {
    await expect(updateUserRole('uid-1', 'deus')).rejects.toThrow(
      'Role inválido.',
    );
  });
});

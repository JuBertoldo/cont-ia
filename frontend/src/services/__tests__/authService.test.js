import {
  registerWithEmail,
  loginWithEmail,
  getIdToken,
  getUserStatus,
  checkMatriculaExists,
} from '../authService';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../config/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'uid-test' } },
  db: {},
}));

const mockSetDoc = jest.fn(async () => {});
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockGetIdToken = jest.fn(async () => 'fake-token');
const mockCreateUser = jest.fn();
const mockSignIn = jest.fn();
const mockUpdateProfile = jest.fn(async () => {});
const mockSignOut = jest.fn(async () => {});

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args) => mockCreateUser(...args),
  signInWithEmailAndPassword: (...args) => mockSignIn(...args),
  updateProfile: (...args) => mockUpdateProfile(...args),
  sendPasswordResetEmail: jest.fn(async () => {}),
  signOut: (...args) => mockSignOut(...args),
  getIdToken: (...args) => mockGetIdToken(...args),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'docRef'),
  collection: jest.fn(() => 'colRef'),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  setDoc: (...args) => mockSetDoc(...args),
  query: jest.fn(() => 'queryRef'),
  where: jest.fn(() => 'whereClause'),
  serverTimestamp: jest.fn(() => 'TIMESTAMP'),
}));

jest.mock('../empresaService', () => ({
  createEmpresa: jest.fn(async () => ({ id: 'empresa-id', codigo: 'ABC123' })),
  getEmpresaByCodigo: jest.fn(async () => ({
    id: 'empresa-id',
    codigo: 'ABC123',
  })),
}));

afterEach(() => jest.clearAllMocks());

// ── getIdToken ────────────────────────────────────────────────────────────────

describe('getIdToken', () => {
  it('retorna token com forceRefresh=false por padrão', async () => {
    const token = await getIdToken();
    expect(mockGetIdToken).toHaveBeenCalledWith({ uid: 'uid-test' }, false);
    expect(token).toBe('fake-token');
  });

  it('passa forceRefresh=true quando solicitado', async () => {
    await getIdToken(true);
    expect(mockGetIdToken).toHaveBeenCalledWith({ uid: 'uid-test' }, true);
  });
});

// ── loginWithEmail ────────────────────────────────────────────────────────────

describe('loginWithEmail', () => {
  it('retorna o user após login bem-sucedido', async () => {
    const fakeUser = { uid: 'uid-123', email: 'a@b.com' };
    mockSignIn.mockResolvedValueOnce({ user: fakeUser });

    const result = await loginWithEmail({
      email: 'a@b.com',
      password: '123456',
    });
    expect(result).toEqual(fakeUser);
    expect(mockSignIn).toHaveBeenCalledWith(
      expect.anything(),
      'a@b.com',
      '123456',
    );
  });

  it('propaga erro do Firebase ao falhar', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('auth/wrong-password'));
    await expect(
      loginWithEmail({ email: 'a@b.com', password: 'errada' }),
    ).rejects.toThrow('auth/wrong-password');
  });
});

// ── registerWithEmail — criando empresa nova ──────────────────────────────────

describe('registerWithEmail — nova empresa', () => {
  it('cria usuário como admin ativo ao criar empresa nova', async () => {
    const fakeUser = { uid: 'uid-novo' };
    mockCreateUser.mockResolvedValueOnce({ user: fakeUser });

    const result = await registerWithEmail({
      name: 'João',
      email: 'joao@test.com',
      password: '123456',
      matricula: 'MAT001',
      nomeEmpresa: 'Empresa Teste',
    });

    expect(result).toEqual(fakeUser);
    expect(mockSetDoc).toHaveBeenCalledWith(
      'docRef',
      expect.objectContaining({ role: 'admin', status: 'active' }),
    );
  });
});

// ── registerWithEmail — entrando em empresa existente ────────────────────────

describe('registerWithEmail — empresa existente', () => {
  it('cria usuário como pendente ao entrar em empresa existente', async () => {
    const fakeUser = { uid: 'uid-novo2' };
    mockCreateUser.mockResolvedValueOnce({ user: fakeUser });
    mockGetDocs.mockResolvedValueOnce({ empty: true }); // matrícula não existe

    const result = await registerWithEmail({
      name: 'Maria',
      email: 'maria@test.com',
      password: '123456',
      matricula: 'MAT002',
      codigoEmpresa: 'ABC123',
    });

    expect(result).toEqual(fakeUser);
    expect(mockSetDoc).toHaveBeenCalledWith(
      'docRef',
      expect.objectContaining({ role: 'user', status: 'pending' }),
    );
  });

  it('lança erro se código de empresa não existir', async () => {
    const { getEmpresaByCodigo } = require('../empresaService');
    getEmpresaByCodigo.mockResolvedValueOnce(null);

    await expect(
      registerWithEmail({
        name: 'X',
        email: 'x@test.com',
        password: '123',
        codigoEmpresa: 'INVALIDO',
      }),
    ).rejects.toThrow('Código de empresa inválido.');
  });

  it('lança erro se matrícula já estiver em uso na empresa', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: false }); // matrícula já existe

    await expect(
      registerWithEmail({
        name: 'Y',
        email: 'y@test.com',
        password: '123',
        matricula: 'DUP001',
        codigoEmpresa: 'ABC123',
      }),
    ).rejects.toThrow('Matrícula já cadastrada nesta empresa.');
  });
});

// ── getUserStatus ─────────────────────────────────────────────────────────────

describe('getUserStatus', () => {
  it('retorna o status do usuário quando o doc existe', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ status: 'active' }),
    });
    const status = await getUserStatus('uid-abc');
    expect(status).toBe('active');
  });

  it('retorna "pending" quando o doc não existe', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    const status = await getUserStatus('uid-novo');
    expect(status).toBe('pending');
  });
});

// ── checkMatriculaExists ──────────────────────────────────────────────────────

describe('checkMatriculaExists', () => {
  it('retorna true quando matrícula já existe', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: false });
    const result = await checkMatriculaExists('MAT001', 'emp-1');
    expect(result).toBe(true);
  });

  it('retorna false quando matrícula não existe', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true });
    const result = await checkMatriculaExists('MAT999', 'emp-1');
    expect(result).toBe(false);
  });
});

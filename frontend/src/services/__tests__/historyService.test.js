import {
  subscribeInventoryHistory,
  buildInventoryHistoryQuery,
  fetchNextInventoryPage,
} from '../historyService.js';
import { ROLES } from '../../constants/roles';
import { PAGE_SIZE } from '../../constants/config';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../config/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'user-123' } },
  db: {},
}));

const mockOnSnapshot = jest.fn();
const mockGetDocs = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'colRef'),
  doc: jest.fn(() => 'docRef'),
  getDoc: jest.fn(async () => ({
    exists: () => true,
    data: () => ({ role: 'user', empresaId: 'emp-1' }),
  })),
  getDocs: (...args) => mockGetDocs(...args),
  where: jest.fn(() => 'whereClause'),
  orderBy: jest.fn(() => 'orderByClause'),
  query: jest.fn(() => 'queryRef'),
  limit: jest.fn(() => 'limitClause'),
  startAfter: jest.fn(() => 'startAfterClause'),
  onSnapshot: (...args) => mockOnSnapshot(...args),
}));

afterEach(() => jest.clearAllMocks());

// ── subscribeInventoryHistory ─────────────────────────────────────────────────

describe('subscribeInventoryHistory', () => {
  it('chama onData com lista, role, lastDoc e hasMore', async () => {
    const unsubscribeFn = jest.fn();
    const fakeDocs = [
      { id: '1', data: () => ({ item: 'Notebook' }) },
      { id: '2', data: () => ({ item: 'Mouse' }) },
    ];

    mockOnSnapshot.mockImplementation((q, onNext) => {
      onNext({ docs: fakeDocs });
      return unsubscribeFn;
    });

    const onData = jest.fn();
    const unsubscribe = await subscribeInventoryHistory({
      onData,
      onError: jest.fn(),
    });

    expect(onData).toHaveBeenCalledWith(
      [
        { id: '1', item: 'Notebook' },
        { id: '2', item: 'Mouse' },
      ],
      ROLES.USER,
      fakeDocs[fakeDocs.length - 1], // lastDoc
      expect.any(Boolean), // hasMore
    );

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
    expect(unsubscribeFn).toHaveBeenCalled();
  });

  it('indica hasMore=true quando resultado tem PAGE_SIZE docs', async () => {
    const fakeDocs = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      id: `doc-${i}`,
      data: () => ({ item: `item-${i}` }),
    }));

    mockOnSnapshot.mockImplementation((q, onNext) => {
      onNext({ docs: fakeDocs });
      return jest.fn();
    });

    const onData = jest.fn();
    await subscribeInventoryHistory({ onData, onError: jest.fn() });

    const [, , , hasMore] = onData.mock.calls[0];
    expect(hasMore).toBe(true);
  });

  it('indica hasMore=false quando resultado tem menos de PAGE_SIZE docs', async () => {
    mockOnSnapshot.mockImplementation((q, onNext) => {
      onNext({ docs: [{ id: '1', data: () => ({}) }] });
      return jest.fn();
    });

    const onData = jest.fn();
    await subscribeInventoryHistory({ onData, onError: jest.fn() });

    const [, , , hasMore] = onData.mock.calls[0];
    expect(hasMore).toBe(false);
  });

  it('chama onError quando onSnapshot falhar', async () => {
    mockOnSnapshot.mockImplementation((q, onNext, onErr) => {
      onErr(new Error('Falha Firestore'));
      return jest.fn();
    });

    const onError = jest.fn();
    await subscribeInventoryHistory({ onData: jest.fn(), onError });
    expect(onError).toHaveBeenCalled();
  });

  it('retorna lista vazia e unsubscribe noop quando não há usuário', async () => {
    const firebaseConfig = require('../../config/firebaseConfig');
    const original = firebaseConfig.auth;
    firebaseConfig.auth = { currentUser: null };

    const onData = jest.fn();
    const unsub = await subscribeInventoryHistory({
      onData,
      onError: jest.fn(),
    });

    expect(onData).toHaveBeenCalledWith([], ROLES.USER, null, false);
    expect(typeof unsub).toBe('function');

    firebaseConfig.auth = original;
  });
});

// ── fetchNextInventoryPage ────────────────────────────────────────────────────

describe('fetchNextInventoryPage', () => {
  it('retorna itens da próxima página', async () => {
    const fakeDocs = [{ id: 'p1', data: () => ({ item: 'Item A' }) }];
    mockGetDocs.mockResolvedValueOnce({ docs: fakeDocs });

    const result = await fetchNextInventoryPage({
      cursor: 'cursor-doc',
      role: ROLES.USER,
      uid: 'uid-1',
      empresaId: 'emp-1',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].item).toBe('Item A');
    expect(result.hasMore).toBe(false);
  });

  it('retorna vazio quando cursor é null', async () => {
    const result = await fetchNextInventoryPage({
      cursor: null,
      role: ROLES.USER,
      uid: 'uid-1',
      empresaId: 'emp-1',
    });

    expect(result).toEqual({ items: [], lastDoc: null, hasMore: false });
    expect(mockGetDocs).not.toHaveBeenCalled();
  });
});

// ── buildInventoryHistoryQuery ────────────────────────────────────────────────

describe('buildInventoryHistoryQuery', () => {
  it('lança erro se uid não for fornecido', () => {
    expect(() =>
      buildInventoryHistoryQuery({
        role: ROLES.USER,
        uid: null,
        empresaId: null,
      }),
    ).toThrow('Usuário não autenticado.');
  });

  it('constrói query sem filtro de empresa para super_admin', () => {
    const q = buildInventoryHistoryQuery({
      role: ROLES.SUPER_ADMIN,
      uid: 'uid-1',
      empresaId: null,
    });
    expect(q).toBe('queryRef');
  });

  it('constrói query com filtro de empresa para admin', () => {
    const q = buildInventoryHistoryQuery({
      role: ROLES.ADMIN,
      uid: 'uid-1',
      empresaId: 'emp-1',
    });
    expect(q).toBe('queryRef');
  });

  it('constrói query com filtro de usuário para user', () => {
    const q = buildInventoryHistoryQuery({
      role: ROLES.USER,
      uid: 'uid-1',
      empresaId: 'emp-1',
    });
    expect(q).toBe('queryRef');
  });
});

import { subscribeInventoryHistory } from '../historyService.js';

jest.mock('../../config/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'user-123' } },
  db: {},
}));

jest.mock('firebase/firestore', () => {
  const onSnapshotMock = jest.fn();

  return {
    collection: jest.fn(() => 'collectionRef'),
    doc: jest.fn(() => 'docRef'),
    getDoc: jest.fn(async () => ({
      exists: () => true,
      data: () => ({ role: 'user' }),
    })),
    where: jest.fn(() => 'whereClause'),
    orderBy: jest.fn(() => 'orderByClause'),
    query: jest.fn(() => 'queryRef'),
    onSnapshot: onSnapshotMock,
    __mocks__: {
      onSnapshotMock,
    },
  };
});

describe('historyService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve assinar histórico e retornar lista no onData', async () => {
    const { __mocks__ } = require('firebase/firestore');

    const unsubscribeFn = jest.fn();

    __mocks__.onSnapshotMock.mockImplementation((q, onNext) => {
      onNext({
        docs: [
          { id: '1', data: () => ({ item: 'Notebook' }) },
          { id: '2', data: () => ({ item: 'Mouse' }) },
        ],
      });
      return unsubscribeFn;
    });

    const onData = jest.fn();
    const onError = jest.fn();

    const unsubscribe = await subscribeInventoryHistory({ onData, onError });

    expect(onData).toHaveBeenCalledWith(
      [
        { id: '1', item: 'Notebook' },
        { id: '2', item: 'Mouse' },
      ],
      'user',
    );

    expect(onError).not.toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
    expect(unsubscribeFn).toHaveBeenCalled();
  });

  it('deve chamar onError quando onSnapshot falhar', async () => {
    const { __mocks__ } = require('firebase/firestore');

    __mocks__.onSnapshotMock.mockImplementation((q, onNext, onErr) => {
      onErr(new Error('Falha Firestore'));
      return jest.fn();
    });

    const onData = jest.fn();
    const onError = jest.fn();

    await subscribeInventoryHistory({ onData, onError });

    expect(onError).toHaveBeenCalled();
  });
});

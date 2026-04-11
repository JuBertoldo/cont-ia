import { exportInventoryToCSV } from '../ExportService';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn().mockResolvedValue({ success: true }) },
}));

import RNFS from 'react-native-fs';
import Share from 'react-native-share';

afterEach(() => {
  jest.clearAllMocks();
});

// ── helpers ───────────────────────────────────────────────────────────────────

const makeItem = (overrides = {}) => ({
  id: 'doc-1',
  scanId: 'scan_uid_1234',
  item: 'Parafuso',
  classificacao: 'hardware',
  quantidade: 10,
  repetidos: 2,
  descricao: 'Detectados: Parafuso',
  usuarioNome: 'João',
  usuarioRole: 'user',
  local: 'Estoque A',
  createdAt: { toDate: () => new Date('2024-01-15T10:00:00Z') },
  fotoUrl: 'https://example.com/foto.jpg',
  ...overrides,
});

// ── exportInventoryToCSV ──────────────────────────────────────────────────────

describe('exportInventoryToCSV', () => {
  it('lança erro quando lista é vazia', async () => {
    await expect(exportInventoryToCSV([])).rejects.toThrow(
      'Nenhum item para exportar',
    );
  });

  it('lança erro quando lista é nula', async () => {
    await expect(exportInventoryToCSV(null)).rejects.toThrow();
  });

  it('grava arquivo CSV com headers corretos', async () => {
    await exportInventoryToCSV([makeItem()]);

    expect(RNFS.writeFile).toHaveBeenCalledTimes(1);

    const csvContent = RNFS.writeFile.mock.calls[0][1];
    const lines = csvContent.split('\n');

    expect(lines[0]).toContain('scanId');
    expect(lines[0]).toContain('item');
    expect(lines[0]).toContain('classificacao');
    expect(lines[1]).toContain('Parafuso');
    expect(lines[1]).toContain('hardware');
  });

  it('escapa aspas duplas nos valores', async () => {
    await exportInventoryToCSV([makeItem({ item: 'Item "especial"' })]);

    const csvContent = RNFS.writeFile.mock.calls[0][1];
    expect(csvContent).toContain('""especial""');
  });

  it('chama Share.open com o caminho do arquivo', async () => {
    await exportInventoryToCSV([makeItem()]);

    expect(Share.open).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text/csv',
        url: expect.stringContaining('contagem_'),
      }),
    );
  });

  it('exporta múltiplos itens corretamente', async () => {
    await exportInventoryToCSV([
      makeItem({ scanId: 'scan_1' }),
      makeItem({ scanId: 'scan_2' }),
    ]);

    const csvContent = RNFS.writeFile.mock.calls[0][1];
    const lines = csvContent.split('\n');
    expect(lines).toHaveLength(3); // header + 2 linhas
  });
});

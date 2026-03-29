import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const exportInventoryToCSV = async (items) => {
  try {
    if (!items || items.length === 0) {
      throw new Error('Nenhum item para exportar.');
    }

    const headers = [
      'scanId',
      'item',
      'classificacao',
      'quantidade',
      'repetidos',
      'descricao',
      'usuarioNome',
      'usuarioRole',
      'local',
      'createdAt',
      'fotoUrl',
    ];

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = items.map((item) => [
      escapeCSV(item.scanId || item.id),
      escapeCSV(item.item),
      escapeCSV(item.classificacao),
      escapeCSV(item.quantidade ?? 0),
      escapeCSV(item.repetidos ?? 0),
      escapeCSV(item.descricao || ''),
      escapeCSV(item.usuarioNome || ''),
      escapeCSV(item.usuarioRole || 'user'),
      escapeCSV(item.local || ''),
      escapeCSV(
        item.createdAt?.toDate ? item.createdAt.toDate().toISOString() : ''
      ),
      escapeCSV(item.fotoUrl || ''),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const fileUri = FileSystem.documentDirectory + `inventario_${Date.now()}.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Compartilhamento não disponível neste dispositivo.');
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Exportar inventário',
      UTI: 'public.comma-separated-values-text',
    });

    return fileUri;
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    throw error;
  }
};
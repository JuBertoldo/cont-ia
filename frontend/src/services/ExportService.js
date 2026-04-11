import RNFS from 'react-native-fs';
import Share from 'react-native-share';

export const exportInventoryToCSV = async items => {
  if (!items || items.length === 0) {
    throw new Error('Nenhum item para exportar.');
  }

  const escapeCSV = value => {
    if (value === null || value === undefined) return '';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  // Formata o breakdown de itens detectados para uma célula legível
  const formatItens = itens => {
    if (!Array.isArray(itens) || itens.length === 0) return '';
    return itens.map(i => `${i.label}: ${i.quantidade}`).join(' | ');
  };

  const headers = [
    'scanId',
    'item_principal',
    'itens_detectados',
    'total_geral',
    'classificacao',
    'descricao',
    'usuarioNome',
    'usuarioRole',
    'local',
    'latitude',
    'longitude',
    'createdAt',
    'fotoUrl',
  ];

  const rows = items.map(item => [
    escapeCSV(item.scanId || item.id),
    escapeCSV(item.item),
    escapeCSV(formatItens(item.itens)),
    escapeCSV(item.totalGeral ?? item.quantidade ?? 0),
    escapeCSV(item.classificacao),
    escapeCSV(item.descricao || ''),
    escapeCSV(item.usuarioNome || ''),
    escapeCSV(item.usuarioRole || 'user'),
    escapeCSV(item.local || ''),
    escapeCSV(item.latitude ?? ''),
    escapeCSV(item.longitude ?? ''),
    escapeCSV(
      item.createdAt?.toDate ? item.createdAt.toDate().toISOString() : '',
    ),
    escapeCSV(item.fotoUrl || ''),
  ]);

  const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

  const fileName = `contagem_${Date.now()}.csv`;
  const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  await RNFS.writeFile(filePath, csv, 'utf8');

  await Share.open({
    url: `file://${filePath}`,
    type: 'text/csv',
    filename: fileName,
    failOnCancel: false,
  });

  return filePath;
};

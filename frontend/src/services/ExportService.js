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

  const formatItens = itens => {
    if (!Array.isArray(itens) || itens.length === 0) return '';
    return itens.map(i => `${i.label}: ${i.quantidade}`).join(' | ');
  };

  const formatDiaHora = createdAt => {
    if (!createdAt) return '';
    const d = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatLocalExato = item => {
    if (item.local && String(item.local).trim())
      return String(item.local).trim();
    if (item.latitude && item.longitude) {
      return `${Number(item.latitude).toFixed(5)}, ${Number(
        item.longitude,
      ).toFixed(5)}`;
    }
    return '';
  };

  const formatTipoUsuario = role => {
    const tipos = {
      admin: 'Administrador',
      user: 'Usuário',
      super_admin: 'Super Admin',
    };
    return tipos[role] || role || 'Usuário';
  };

  const headers = [
    'Classificação',
    'Item_principal',
    'Itens_detectados',
    'Total_geral',
    'Descrição',
    'Email',
    'Local_exato',
    'Dia e Hora',
    'Tipo_de_usuario',
    'ScanId',
  ];

  const rows = items.map(item => [
    escapeCSV(item.classificacao),
    escapeCSV(item.item),
    escapeCSV(formatItens(item.itens)),
    escapeCSV(item.totalGeral ?? item.quantidade ?? 0),
    escapeCSV(item.descricao || ''),
    escapeCSV(item.usuarioEmail || item.usuarioNome || ''),
    escapeCSV(formatLocalExato(item)),
    escapeCSV(formatDiaHora(item.createdAt)),
    escapeCSV(formatTipoUsuario(item.usuarioRole)),
    escapeCSV(item.scanId || item.id),
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

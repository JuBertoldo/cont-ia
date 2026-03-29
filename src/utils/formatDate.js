export const formatDateTime = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return {
      date: '-',
      time: '-',
    };
  }

  const date = timestamp.toDate();

  return {
    date: date.toLocaleDateString('pt-BR'),
    time: date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

export const formatDateOnly = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return '-';
  }

  return timestamp.toDate().toLocaleDateString('pt-BR');
};
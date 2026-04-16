/** Número de itens carregados por página nas queries Firestore */
export const PAGE_SIZE = 30;

/** Número de dias do gráfico na tela Home */
export const CHART_DAYS = 7;

/** Opções de filtro de data no histórico */
export const DATE_FILTER_KEYS = {
  ALL: 'all',
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  DAYS_60: '60days',
  DAYS_90: '90days',
};

export const DATE_FILTER_DAYS = {
  [DATE_FILTER_KEYS.WEEK]: 7,
  [DATE_FILTER_KEYS.MONTH]: 30,
  [DATE_FILTER_KEYS.DAYS_60]: 60,
  [DATE_FILTER_KEYS.DAYS_90]: 90,
};

export const DATE_FILTERS = [
  { key: DATE_FILTER_KEYS.ALL, label: 'Todos', icon: 'list-outline' },
  { key: DATE_FILTER_KEYS.TODAY, label: 'Hoje', icon: 'today-outline' },
  { key: DATE_FILTER_KEYS.WEEK, label: '7 dias', icon: 'calendar-outline' },
  { key: DATE_FILTER_KEYS.MONTH, label: '30 dias', icon: 'calendar-outline' },
  { key: DATE_FILTER_KEYS.DAYS_60, label: '60 dias', icon: 'calendar-outline' },
  { key: DATE_FILTER_KEYS.DAYS_90, label: '90 dias', icon: 'calendar-outline' },
];

/** Status possíveis de um usuário */
export const USER_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  REJECTED: 'rejected',
};

/** Status possíveis de um scan */
export const SCAN_STATUS = {
  NORMAL: 'normal',
  CONTESTED: 'contested',
};

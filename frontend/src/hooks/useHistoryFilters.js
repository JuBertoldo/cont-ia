import { useMemo, useState } from 'react';
import { DATE_FILTER_KEYS, DATE_FILTER_DAYS } from '../constants/config';

function isToday(item) {
  const ts = item.createdAt?.toDate?.() || item.createdAt;
  if (!ts) return false;
  const now = new Date();
  return (
    ts.getDate() === now.getDate() &&
    ts.getMonth() === now.getMonth() &&
    ts.getFullYear() === now.getFullYear()
  );
}

function isWithinDays(item, days) {
  const ts = item.createdAt?.toDate?.() || item.createdAt;
  if (!ts) return false;
  const limit = new Date();
  limit.setDate(limit.getDate() - days);
  return ts >= limit;
}

/**
 * Hook que encapsula toda a lógica de filtro do histórico.
 * Elimina o useMemo de 30 linhas inline no HistoryScreen.
 *
 * @param {Array} items - Lista completa de registros
 * @param {string} originFilter - Filtro de origem ('all' | 'audited')
 */
export function useHistoryFilters(items, originFilter) {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(DATE_FILTER_KEYS.ALL);

  const filteredItems = useMemo(() => {
    let result = items;

    if (originFilter === 'audited') {
      result = result.filter(i => i.origem === 'scanner');
    }

    if (dateFilter === DATE_FILTER_KEYS.TODAY) {
      result = result.filter(isToday);
    } else if (DATE_FILTER_DAYS[dateFilter]) {
      result = result.filter(i =>
        isWithinDays(i, DATE_FILTER_DAYS[dateFilter]),
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        i =>
          i.item?.toLowerCase().includes(q) ||
          i.usuarioNome?.toLowerCase().includes(q) ||
          i.local?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [items, originFilter, dateFilter, search]);

  return { filteredItems, search, setSearch, dateFilter, setDateFilter };
}

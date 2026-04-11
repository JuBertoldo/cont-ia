import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { getUserProfile } from '../services/authService';
import { COLLECTIONS } from '../constants/collections';
import { ROLES } from '../constants/roles';
import { CHART_DAYS } from '../constants/config';

function buildLast7DaysLabels() {
  const labels = [];
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
  }
  return labels;
}

function groupByDay(items) {
  const today = new Date();
  const counts = Array(CHART_DAYS).fill(0);
  items.forEach(item => {
    const ts = item.createdAt?.toDate?.() || item.createdAt;
    if (!ts) return;
    const diff = Math.floor((today - ts) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff < CHART_DAYS) counts[CHART_DAYS - 1 - diff]++;
  });
  return counts;
}

async function fetchInventoryItems(role, empresaId, uid) {
  const q =
    (role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN) && empresaId
      ? query(
          collection(db, COLLECTIONS.INVENTORY),
          where('empresaId', '==', empresaId),
          orderBy('createdAt', 'desc'),
        )
      : query(
          collection(db, COLLECTIONS.INVENTORY),
          where('usuarioId', '==', uid),
          orderBy('createdAt', 'desc'),
        );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchUserStats(empresaId) {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.USERS),
      where('empresaId', '==', empresaId),
    ),
  );
  const all = snap.docs.map(d => d.data());
  return {
    totalUsers: all.length,
    pendingUsers: all.filter(u => (u.status || 'pending') === 'pending').length,
  };
}

/**
 * Hook que encapsula toda a lógica de carregamento do dashboard (HomeScreen).
 */
export function useDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    nome: 'Operador',
    role: ROLES.USER,
    photoURL: '',
    empresaId: null,
  });
  const [totalItems, setTotalItems] = useState(0);
  const [auditedItems, setAuditedItems] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pendingUsers, setPendingUsers] = useState(0);
  const [chartData, setChartData] = useState(Array(CHART_DAYS).fill(0));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) return;

      const data = await getUserProfile(auth.currentUser.uid);
      const role = data?.role || ROLES.USER;
      const empresaId = data?.empresaId || null;
      setProfile({
        nome: data?.nome || 'Operador',
        role,
        photoURL: data?.photoURL || '',
        empresaId,
      });

      const items = await fetchInventoryItems(
        role,
        empresaId,
        auth.currentUser.uid,
      );
      setTotalItems(items.length);
      setAuditedItems(items.filter(i => i.origem === 'scanner').length);
      setChartData(groupByDay(items));

      if ((role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN) && empresaId) {
        const stats = await fetchUserStats(empresaId);
        setTotalUsers(stats.totalUsers);
        setPendingUsers(stats.pendingUsers);
      }
    } catch (error) {
      console.error('useDashboard: erro ao carregar dashboard', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    loading,
    profile,
    totalItems,
    auditedItems,
    totalUsers,
    pendingUsers,
    chartData,
    chartLabels: buildLast7DaysLabels(),
    reload: load,
  };
}

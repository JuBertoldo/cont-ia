import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BarChart } from 'react-native-chart-kit';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

import { auth, db } from '../../config/firebaseConfig';
import { getUserProfile } from '../../services/authService';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function buildLast7DaysLabels() {
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
  }
  return labels;
}

function groupByDay(items) {
  const today = new Date();
  const counts = Array(7).fill(0);

  items.forEach(item => {
    const ts = item.createdAt?.toDate?.() || item.createdAt;
    if (!ts) return;
    const diff = Math.floor((today - ts) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff < 7) counts[6 - diff]++;
  });

  return counts;
}

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Operador');
  const [role, setRole] = useState('user');
  const [photoURL, setPhotoURL] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [auditedItems, setAuditedItems] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pendingUsers, setPendingUsers] = useState(0);
  const [chartData, setChartData] = useState(Array(7).fill(0));

  const loadDashboard = useCallback(async () => {
    try {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      const profile = await getUserProfile(auth.currentUser.uid);
      const userRole = profile?.role || 'user';
      const empresaId = profile?.empresaId || null;
      setUserName(profile?.nome || 'Operador');
      setRole(userRole);
      setPhotoURL(profile?.photoURL || '');

      // Admin vê todos os itens da empresa; usuário vê apenas os seus
      const inventarioQuery =
        userRole === 'admin' && empresaId
          ? query(
              collection(db, 'inventario'),
              where('empresaId', '==', empresaId),
              orderBy('createdAt', 'desc'),
            )
          : query(
              collection(db, 'inventario'),
              where('usuarioId', '==', auth.currentUser.uid),
              orderBy('createdAt', 'desc'),
            );

      const snapshot = await getDocs(inventarioQuery);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      setTotalItems(items.length);
      setAuditedItems(items.filter(item => item.origem === 'scanner').length);
      setChartData(groupByDay(items));

      if (userRole === 'admin' && empresaId) {
        const usersSnap = await getDocs(
          query(
            collection(db, 'usuarios'),
            where('empresaId', '==', empresaId),
          ),
        );
        const allUsers = usersSnap.docs.map(d => d.data());
        setTotalUsers(allUsers.length);
        setPendingUsers(
          allUsers.filter(u => (u.status || 'pending') === 'pending').length,
        );
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const labels = buildLast7DaysLabels();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.openDrawer()}
          style={styles.menuBtn}
        >
          <Ionicons name="menu-outline" size={30} color={COLORS.WHITE} />
        </TouchableOpacity>
        <TouchableOpacity onPress={loadDashboard}>
          <Ionicons name="refresh-outline" size={24} color={COLORS.GRAY} />
        </TouchableOpacity>
      </View>

      {/* Perfil */}
      <View style={styles.profileBlock}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-circle-outline" size={110} color="#666" />
          </View>
        )}
        <Text style={styles.userName}>{userName}</Text>
        {role === 'admin' ? (
          <View style={styles.adminBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={COLORS.BLACK}
            />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        ) : (
          <Text style={styles.userRoleText}>Perfil usuário</Text>
        )}
      </View>

      {/* Cards de estatísticas */}
      <View style={styles.statsRow}>
        <View style={styles.card}>
          <Ionicons name="cube-outline" size={28} color={COLORS.PRIMARY} />
          {loading ? (
            <ActivityIndicator
              color={COLORS.PRIMARY}
              style={{ marginVertical: 10 }}
            />
          ) : (
            <Text style={styles.cardValue}>{totalItems}</Text>
          )}
          <Text style={styles.cardLabel}>Contagens Totais</Text>
        </View>

        <View style={styles.card}>
          <Ionicons
            name="checkmark-done-outline"
            size={28}
            color={COLORS.PRIMARY}
          />
          {loading ? (
            <ActivityIndicator
              color={COLORS.PRIMARY}
              style={{ marginVertical: 10 }}
            />
          ) : (
            <Text style={styles.cardValue}>{auditedItems}</Text>
          )}
          <Text style={styles.cardLabel}>Contados</Text>
        </View>

        {role === 'admin' && (
          <View style={styles.card}>
            <Ionicons name="people-outline" size={28} color={COLORS.PRIMARY} />
            {loading ? (
              <ActivityIndicator
                color={COLORS.PRIMARY}
                style={{ marginVertical: 10 }}
              />
            ) : (
              <Text style={styles.cardValue}>{totalUsers}</Text>
            )}
            <Text style={styles.cardLabel}>Usuários</Text>
          </View>
        )}
      </View>

      {/* Alerta de usuários pendentes (admin) */}
      {role === 'admin' && pendingUsers > 0 && (
        <TouchableOpacity
          style={styles.pendingAlert}
          onPress={() => navigation.navigate(ROUTES.ADMIN_USERS)}
        >
          <Ionicons name="time-outline" size={20} color={COLORS.BLACK} />
          <Text style={styles.pendingAlertText}>
            {pendingUsers} usuário{pendingUsers > 1 ? 's' : ''} aguardando
            aprovação
          </Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.BLACK} />
        </TouchableOpacity>
      )}

      {/* Gráfico últimos 7 dias */}
      {!loading && (
        <View style={styles.chartBlock}>
          <Text style={styles.sectionTitle}>Contagens nos últimos 7 dias</Text>
          <BarChart
            data={{
              labels,
              datasets: [{ data: chartData.map(v => Math.max(v, 0)) }],
            }}
            width={SCREEN_WIDTH - 40}
            height={180}
            fromZero
            showValuesOnTopOfBars
            chartConfig={{
              backgroundGradientFrom: COLORS.DARK,
              backgroundGradientTo: COLORS.DARK,
              decimalPlaces: 0,
              color: () => COLORS.PRIMARY,
              labelColor: () => COLORS.GRAY,
              barPercentage: 0.6,
            }}
            style={styles.chart}
          />
        </View>
      )}

      {/* Botão flutuante nova contagem */}
      <TouchableOpacity
        style={styles.fabBtn}
        onPress={() => navigation.navigate(ROUTES.SCANNER)}
      >
        <Ionicons name="camera-outline" size={26} color={COLORS.BLACK} />
        <Text style={styles.fabBtnText}>NOVA CONTAGEM</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BLACK, padding: 20 },
  header: {
    marginTop: 50,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuBtn: { padding: 4 },
  profileBlock: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.DARK,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.DARK,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  userName: {
    color: COLORS.WHITE,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  userRoleText: { color: COLORS.GRAY, marginTop: 6 },
  adminBadge: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  adminBadgeText: { color: COLORS.BLACK, fontWeight: 'bold' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.DARK,
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  cardValue: {
    color: COLORS.WHITE,
    fontSize: 26,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  cardLabel: {
    color: COLORS.GRAY,
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chartBlock: { marginBottom: 28 },
  chart: { borderRadius: 14 },
  sectionTitle: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  actionBtn: {
    backgroundColor: COLORS.PRIMARY,
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  actionBtnText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 15 },
  fabBtn: {
    backgroundColor: COLORS.PRIMARY,
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 20,
  },
  fabBtnText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 15 },
  drawerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.DARK,
    borderRadius: 20,
  },
  drawerTriggerText: { color: COLORS.GRAY, fontSize: 13 },
  pendingAlert: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  pendingAlertText: {
    color: COLORS.BLACK,
    fontWeight: 'bold',
    flex: 1,
    fontSize: 14,
  },
});

import React from 'react';
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

import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { ROLES, ROLE_LABELS } from '../../constants/roles';
import { useDashboard } from '../../hooks/useDashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const {
    loading,
    profile,
    totalItems,
    auditedItems,
    totalUsers,
    pendingUsers,
    chartData,
    chartLabels,
    reload,
  } = useDashboard();

  const isAdmin =
    profile.role === ROLES.ADMIN || profile.role === ROLES.SUPER_ADMIN;

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
        <TouchableOpacity onPress={reload}>
          <Ionicons name="refresh-outline" size={24} color={COLORS.GRAY} />
        </TouchableOpacity>
      </View>

      {/* Perfil */}
      <View style={styles.profileBlock}>
        {profile.photoURL ? (
          <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-circle-outline" size={110} color="#666" />
          </View>
        )}
        <Text style={styles.userName}>{profile.nome}</Text>
        {isAdmin ? (
          <View style={styles.adminBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={COLORS.BLACK}
            />
            <Text style={styles.adminBadgeText}>
              {ROLE_LABELS[profile.role]}
            </Text>
          </View>
        ) : (
          <Text style={styles.userRoleText}>{ROLE_LABELS[profile.role]}</Text>
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

        {isAdmin && (
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

      {/* Alerta de usuários pendentes */}
      {isAdmin && pendingUsers > 0 && (
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
              labels: chartLabels,
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

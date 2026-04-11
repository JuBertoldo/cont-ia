import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../constants/colors';
import {
  getAllUsersGlobal,
  deleteUserGlobal,
  updateUserRoleGlobal,
  getAllScansGlobal,
  deleteScanGlobal,
} from '../../services/superAdminService';
import { auth } from '../../config/firebaseConfig';

const TABS = [
  { key: 'users', label: 'Usuários', icon: 'people-outline' },
  { key: 'scans', label: 'Contagens', icon: 'cube-outline' },
];

export default function CompanyDetailScreen({ navigation, route }) {
  const { empresa } = route.params;
  const [users, setUsers] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allUsers, allScans] = await Promise.all([
        getAllUsersGlobal(),
        getAllScansGlobal(),
      ]);
      setUsers(allUsers.filter(u => u.empresaId === empresa.id));
      setScans(allScans.filter(s => s.empresaId === empresa.id));
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  }, [empresa.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteUser = user => {
    if (user.id === auth.currentUser?.uid) {
      Alert.alert('Atenção', 'Você não pode excluir sua própria conta.');
      return;
    }
    Alert.alert(
      'Excluir usuário',
      `Excluir permanentemente "${user.nome || user.email}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setActionId(user.id);
            try {
              await deleteUserGlobal(user.id);
              setUsers(prev => prev.filter(u => u.id !== user.id));
            } catch (e) {
              Alert.alert('Erro', e.message);
            } finally {
              setActionId(null);
            }
          },
        },
      ],
    );
  };

  const handleChangeRole = user => {
    const roles = ['user', 'admin', 'super_admin'];
    const options = roles
      .filter(r => r !== user.role)
      .map(r => ({
        text:
          r === 'super_admin'
            ? 'Super Admin'
            : r === 'admin'
            ? 'Admin'
            : 'Usuário',
        onPress: async () => {
          setActionId(user.id);
          try {
            await updateUserRoleGlobal(user.id, r);
            setUsers(prev =>
              prev.map(u => (u.id === user.id ? { ...u, role: r } : u)),
            );
          } catch (e) {
            Alert.alert('Erro', e.message);
          } finally {
            setActionId(null);
          }
        },
      }));
    Alert.alert('Alterar role', `Role atual: ${user.role}`, [
      ...options,
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleDeleteScan = scan => {
    Alert.alert(
      'Excluir contagem',
      'Excluir permanentemente este registro de contagem?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setActionId(scan.id);
            try {
              await deleteScanGlobal(scan.id);
              setScans(prev => prev.filter(s => s.id !== scan.id));
            } catch (e) {
              Alert.alert('Erro', e.message);
            } finally {
              setActionId(null);
            }
          },
        },
      ],
    );
  };

  const roleColor = role => {
    if (role === 'super_admin') return '#9333ea';
    if (role === 'admin') return COLORS.PRIMARY;
    return '#555';
  };

  const roleLabel = role => {
    if (role === 'super_admin') return 'SUPER';
    if (role === 'admin') return 'ADMIN';
    return 'USER';
  };

  const renderUser = ({ item }) => (
    <View style={styles.card}>
      <View
        style={[styles.roleBadge, { backgroundColor: roleColor(item.role) }]}
      >
        <Text style={styles.roleBadgeText}>{roleLabel(item.role)}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.nome || 'Sem nome'}</Text>
        <Text style={styles.cardSub}>{item.email}</Text>
        {!!item.matricula && (
          <Text style={styles.cardSub}>Mat.: {item.matricula}</Text>
        )}
      </View>
      {actionId === item.id ? (
        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handleChangeRole(item)}
            style={styles.actionBtn}
          >
            <Ionicons
              name="swap-horizontal-outline"
              size={18}
              color={COLORS.PRIMARY}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteUser(item)}
            style={styles.actionBtn}
          >
            <Ionicons name="trash-outline" size={18} color="#B00020" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderScan = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.item || 'Não identificado'}</Text>
        <Text style={styles.cardSub}>
          {item.usuarioNome} • {item.quantidade ?? 0} itens
        </Text>
        {item.status === 'contested' && (
          <Text style={styles.contested}>
            ⚠ Contestada: {item.contestReason}
          </Text>
        )}
      </View>
      {actionId === item.id ? (
        <ActivityIndicator size="small" color="#B00020" />
      ) : (
        <TouchableOpacity
          onPress={() => handleDeleteScan(item)}
          style={styles.actionBtn}
        >
          <Ionicons name="trash-outline" size={18} color="#B00020" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{empresa.nome}</Text>
          <Text style={styles.code}>Código: {empresa.codigo}</Text>
        </View>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh-outline" size={24} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? COLORS.BLACK : COLORS.GRAY}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label} (
              {activeTab === tab.key
                ? tab.key === 'users'
                  ? users.length
                  : scans.length
                : '...'}
              )
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.PRIMARY}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={activeTab === 'users' ? users : scans}
          keyExtractor={i => i.id}
          renderItem={activeTab === 'users' ? renderUser : renderScan}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum registro encontrado.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BLACK },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  code: {
    color: COLORS.PRIMARY,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  tabsRow: { marginBottom: 10 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.DARK,
    borderWidth: 1,
    borderColor: '#333',
  },
  tabActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
  tabText: { color: COLORS.GRAY, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: COLORS.BLACK },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.DARK,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeText: { fontSize: 10, fontWeight: 'bold', color: COLORS.BLACK },
  cardInfo: { flex: 1 },
  cardName: { color: COLORS.WHITE, fontWeight: 'bold', fontSize: 14 },
  cardSub: { color: COLORS.GRAY, fontSize: 12, marginTop: 2 },
  contested: { color: '#f59e0b', fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 6 },
  empty: { color: COLORS.GRAY, textAlign: 'center', marginTop: 40 },
});

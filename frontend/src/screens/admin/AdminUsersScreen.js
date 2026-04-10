import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  getAllUsers,
  approveUser,
  rejectUser,
  updateUserRole,
} from '../../services/adminService';
import { auth } from '../../config/firebaseConfig';

const TABS = [
  { key: 'pending', label: 'Pendentes', icon: 'time-outline' },
  { key: 'active', label: 'Ativos', icon: 'checkmark-circle-outline' },
  { key: 'rejected', label: 'Recusados', icon: 'close-circle-outline' },
];

export default function AdminUsersScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllUsers();
      setUsers(list);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(
    () => users.filter(u => (u.status || 'pending') === activeTab),
    [users, activeTab],
  );

  const pendingCount = useMemo(
    () => users.filter(u => (u.status || 'pending') === 'pending').length,
    [users],
  );

  const runAction = async (uid, action, label) => {
    setUpdatingId(uid);
    try {
      await action(uid);
      setUsers(prev =>
        prev.map(u => {
          if (u.id !== uid) return u;
          if (action === approveUser) return { ...u, status: 'active' };
          if (action === rejectUser) return { ...u, status: 'rejected' };
          return u;
        }),
      );
    } catch {
      Alert.alert('Erro', `Não foi possível ${label}.`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = user => {
    Alert.alert(
      'Aprovar usuário',
      `Liberar acesso para "${user.nome || user.email}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar',
          onPress: () => runAction(user.id, approveUser, 'aprovar'),
        },
      ],
    );
  };

  const handleReject = user => {
    Alert.alert(
      'Recusar usuário',
      `Recusar acesso para "${user.nome || user.email}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: () => runAction(user.id, rejectUser, 'recusar'),
        },
      ],
    );
  };

  const handleReactivate = user => {
    Alert.alert(
      'Reativar usuário',
      `Reativar acesso para "${user.nome || user.email}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reativar',
          onPress: () => runAction(user.id, approveUser, 'reativar'),
        },
      ],
    );
  };

  const handleToggleRole = user => {
    if (user.id === auth.currentUser?.uid) {
      Alert.alert('Atenção', 'Você não pode alterar seu próprio perfil.');
      return;
    }
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const label =
      newRole === 'admin' ? 'promover a Admin' : 'rebaixar para Usuário';

    Alert.alert(
      'Alterar perfil',
      `Deseja ${label} "${user.nome || user.email}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setUpdatingId(user.id);
            try {
              await updateUserRole(user.id, newRole);
              setUsers(prev =>
                prev.map(u => (u.id === user.id ? { ...u, role: newRole } : u)),
              );
            } catch {
              Alert.alert('Erro', 'Não foi possível alterar o perfil.');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ],
    );
  };

  const renderUser = ({ item }) => {
    const isCurrentUser = item.id === auth.currentUser?.uid;
    const isUpdating = updatingId === item.id;
    const isAdmin = item.role === 'admin';

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View
            style={[
              styles.roleBadge,
              isAdmin ? styles.badgeAdmin : styles.badgeUser,
            ]}
          >
            <Text style={styles.badgeText}>{isAdmin ? 'ADMIN' : 'USER'}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {item.nome || 'Sem nome'}
              {isCurrentUser ? ' (você)' : ''}
            </Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            {!!item.matricula && (
              <Text style={styles.userMatricula}>Mat.: {item.matricula}</Text>
            )}
          </View>
        </View>

        {isUpdating ? (
          <ActivityIndicator
            size="small"
            color={COLORS.PRIMARY}
            style={styles.spinner}
          />
        ) : (
          <View style={styles.actions}>
            {/* Pendentes: Aprovar / Recusar */}
            {activeTab === 'pending' && (
              <>
                <TouchableOpacity
                  style={styles.btnApprove}
                  onPress={() => handleApprove(item)}
                >
                  <Ionicons
                    name="checkmark-outline"
                    size={18}
                    color={COLORS.BLACK}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnReject}
                  onPress={() => handleReject(item)}
                >
                  <Ionicons
                    name="close-outline"
                    size={18}
                    color={COLORS.WHITE}
                  />
                </TouchableOpacity>
              </>
            )}

            {/* Ativos: mudar role / revogar */}
            {activeTab === 'active' && !isCurrentUser && (
              <>
                <TouchableOpacity
                  style={styles.btnRole}
                  onPress={() => handleToggleRole(item)}
                >
                  <Ionicons
                    name={isAdmin ? 'arrow-down-outline' : 'shield-outline'}
                    size={16}
                    color={COLORS.BLACK}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnReject}
                  onPress={() => handleReject(item)}
                >
                  <Ionicons name="ban-outline" size={16} color={COLORS.WHITE} />
                </TouchableOpacity>
              </>
            )}

            {/* Recusados: Reativar */}
            {activeTab === 'rejected' && (
              <TouchableOpacity
                style={styles.btnApprove}
                onPress={() => handleReactivate(item)}
              >
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={COLORS.BLACK}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Gerenciar Usuários</Text>
        <TouchableOpacity onPress={loadUsers}>
          <Ionicons name="refresh-outline" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      >
        {TABS.map(tab => {
          const isPending = tab.key === 'pending' && pendingCount > 0;
          return (
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
                {tab.label}
              </Text>
              {isPending && (
                <View style={styles.badge}>
                  <Text style={styles.badgeCount}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.subtitle}>
        {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''}
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.PRIMARY}
          style={{ marginTop: 50 }}
        />
      ) : filteredUsers.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>Nenhum usuário nesta categoria.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
  title: { color: COLORS.WHITE, fontSize: 20, fontWeight: 'bold' },
  tabsRow: { marginBottom: 8 },
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
  badge: {
    backgroundColor: '#B00020',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeCount: { color: COLORS.WHITE, fontSize: 10, fontWeight: 'bold' },
  subtitle: {
    color: COLORS.GRAY,
    paddingHorizontal: 20,
    marginBottom: 10,
    fontSize: 12,
  },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  userCard: {
    backgroundColor: COLORS.DARK,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeAdmin: { backgroundColor: COLORS.PRIMARY },
  badgeUser: { backgroundColor: '#333' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: COLORS.BLACK },
  userDetails: { flex: 1 },
  userName: { color: COLORS.WHITE, fontWeight: 'bold', fontSize: 14 },
  userEmail: { color: COLORS.GRAY, fontSize: 12, marginTop: 2 },
  userMatricula: { color: COLORS.PRIMARY, fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  spinner: { marginHorizontal: 10 },
  btnApprove: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnReject: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#B00020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRole: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: { color: COLORS.GRAY, marginTop: 16, fontSize: 15 },
});

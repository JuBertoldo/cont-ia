import React, { useEffect, useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { auth } from '../config/firebaseConfig';
import { logout, getUserProfile } from '../services/authService';
import { subscribeContadorNaoLidas } from '../services/notificationService';
import { ROUTES } from '../constants/routes';
import { COLORS } from '../constants/colors';
import { ROLES, ROLE_LABELS } from '../constants/roles';
import logger from '../utils/logger';

import HomeScreen from '../screens/home/HomeScreen';
import ScannerScreen from '../screens/inventory/ScannerScreen';
import HistoryScreen from '../screens/inventory/HistoryScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import SupportTicketsScreen from '../screens/support/SupportTicketsScreen';
import NotificacoesScreen from '../screens/notifications/NotificacoesScreen';

const Drawer = createDrawerNavigator();

function DrawerItem({ icon, label, onPress, highlight }) {
  return (
    <TouchableOpacity
      style={[styles.drawerItem, highlight && styles.drawerItemHighlight]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon}
        size={22}
        color={highlight ? COLORS.BLACK : COLORS.WHITE}
      />
      <Text
        style={[styles.drawerLabel, highlight && styles.drawerLabelHighlight]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CustomDrawerContent(props) {
  const [userName, setUserName] = useState('Operador');
  const [photoURL, setPhotoURL] = useState('');
  const [role, setRole] = useState('user');
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      if (!auth.currentUser) return;
      try {
        const profile = await getUserProfile(auth.currentUser.uid);
        if (profile) {
          setUserName(profile.nome || 'Operador');
          setPhotoURL(profile.photoURL || '');
          setRole(profile.role || 'user');
        }
      } catch (error) {
        logger.error('Erro ao carregar usuário no drawer:', error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const unsub = subscribeContadorNaoLidas(auth.currentUser.uid, setNaoLidas);
    return unsub;
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      props.navigation.closeDrawer();
      props.navigation.replace(ROUTES.AUTH_HOME);
    } catch {
      Alert.alert('Erro', 'Não foi possível sair.');
    }
  };

  return (
    <View style={styles.drawerContainer}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          props.navigation.closeDrawer();
          props.navigation.navigate(ROUTES.PROFILE);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.avatarWrapper}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons
                name="person-circle-outline"
                size={70}
                color={COLORS.GRAY}
              />
            </View>
          )}
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={10} color={COLORS.BLACK} />
          </View>
        </View>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.roleText}>
          {ROLE_LABELS[role] || ROLE_LABELS[ROLES.USER]}
        </Text>
        <Text style={styles.tapHint}>toque para ver perfil</Text>
      </TouchableOpacity>

      {/* Sininho de notificações */}
      <TouchableOpacity
        style={styles.bellRow}
        onPress={() => {
          props.navigation.closeDrawer();
          props.navigation.navigate(ROUTES.NOTIFICATIONS);
        }}
      >
        <Ionicons
          name="notifications-outline"
          size={20}
          color={naoLidas > 0 ? COLORS.PRIMARY : COLORS.GRAY}
        />
        <Text
          style={[styles.bellLabel, naoLidas > 0 && { color: COLORS.PRIMARY }]}
        >
          Notificações
        </Text>
        {naoLidas > 0 && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>
              {naoLidas > 99 ? '99+' : naoLidas}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.menu}>
        {/* Support: menu exclusivo — sem scanner nem histórico */}
        {role === ROLES.SUPPORT ? (
          <>
            <DrawerItem
              icon="headset-outline"
              label="Chamados"
              highlight
              onPress={() => props.navigation.navigate(ROUTES.SUPPORT_TICKETS)}
            />
          </>
        ) : (
          <>
            <DrawerItem
              icon="home-outline"
              label="Início"
              onPress={() => props.navigation.navigate(ROUTES.HOME)}
            />
            <DrawerItem
              icon="camera-outline"
              label="Nova Contagem"
              onPress={() => props.navigation.navigate(ROUTES.SCANNER)}
            />
            <DrawerItem
              icon="list-outline"
              label="Histórico de Contagens"
              onPress={() =>
                props.navigation.navigate(ROUTES.HISTORY, {
                  filter: 'all',
                  title: 'Histórico de Contagens',
                })
              }
            />
            <DrawerItem
              icon="checkmark-done-outline"
              label="Itens Contados"
              onPress={() =>
                props.navigation.navigate(ROUTES.HISTORY, {
                  filter: 'audited',
                  title: 'Itens Contados',
                })
              }
            />
            <DrawerItem
              icon="help-circle-outline"
              label="Guia Rápido"
              onPress={() => props.navigation.navigate(ROUTES.QUICK_GUIDE)}
            />

            {(role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN) && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>Administração</Text>
                <DrawerItem
                  icon="people-outline"
                  label="Gerenciar Usuários"
                  highlight
                  onPress={() => props.navigation.navigate(ROUTES.ADMIN_USERS)}
                />
                {role === ROLES.ADMIN && (
                  <DrawerItem
                    icon="headset-outline"
                    label="Suporte / Chamados"
                    onPress={() => props.navigation.navigate(ROUTES.SUPPORT)}
                  />
                )}
              </>
            )}

            {role === ROLES.SUPER_ADMIN && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>Sistema</Text>
                <DrawerItem
                  icon="globe-outline"
                  label="Painel do Sistema"
                  highlight
                  onPress={() =>
                    props.navigation.navigate(ROUTES.SUPER_ADMIN_PANEL)
                  }
                />
              </>
            )}
          </>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.RED} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: COLORS.BLACK, width: 300 },
        drawerActiveTintColor: COLORS.PRIMARY,
        drawerInactiveTintColor: COLORS.WHITE,
      }}
      drawerContent={props => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name={ROUTES.HOME} component={HomeScreen} />
      <Drawer.Screen name={ROUTES.SCANNER} component={ScannerScreen} />
      <Drawer.Screen name={ROUTES.HISTORY} component={HistoryScreen} />
      <Drawer.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
      <Drawer.Screen name={ROUTES.ADMIN_USERS} component={AdminUsersScreen} />
      <Drawer.Screen
        name={ROUTES.SUPPORT_TICKETS}
        component={SupportTicketsScreen}
      />
      <Drawer.Screen
        name={ROUTES.NOTIFICATIONS}
        component={NotificacoesScreen}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingBottom: 20,
  },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.BLACK,
  },
  tapHint: {
    color: '#444',
    fontSize: 11,
    marginTop: 4,
  },
  bellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#111',
  },
  bellLabel: { color: COLORS.GRAY, fontSize: 14, flex: 1 },
  bellBadge: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  bellBadgeText: { color: COLORS.BLACK, fontSize: 11, fontWeight: 'bold' },
  userName: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  roleText: { color: COLORS.GRAY, marginTop: 6 },
  menu: { flex: 1, gap: 4 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  drawerItemHighlight: { backgroundColor: COLORS.PRIMARY },
  drawerLabel: { color: COLORS.WHITE, fontSize: 15, fontWeight: '500' },
  drawerLabelHighlight: { color: COLORS.BLACK, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#222', marginVertical: 10 },
  sectionLabel: {
    color: COLORS.GRAY,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  footer: { borderTopWidth: 1, borderTopColor: '#222', paddingVertical: 20 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#111',
  },
  logoutText: { color: COLORS.RED, fontSize: 15, fontWeight: 'bold' },
});

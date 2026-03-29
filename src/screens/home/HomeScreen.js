import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

import { auth, db } from '../../config/firebaseConfig';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';

export default function HomeScreen({ navigation }) {
  const [totalItems, setTotalItems] = useState(0);
  const [auditedItems, setAuditedItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Operador');
  const [role, setRole] = useState('user');
  const [photoURL, setPhotoURL] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'usuarios', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserName(data.nome || 'Operador');
        setRole(data.role || 'user');
        setPhotoURL(data.photoURL || '');
      }

      const q = query(
        collection(db, 'inventario'),
        where('usuarioId', '==', auth.currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map((docSnap) => docSnap.data());

      const total = items.length;
      const audited = items.filter((item) => item.origem === 'scanner').length;

      setTotalItems(total);
      setAuditedItems(audited);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const goToScanner = () => navigation.navigate(ROUTES.SCANNER);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu-outline" size={30} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>

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
            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.BLACK} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        ) : (
          <Text style={styles.userRoleText}>Perfil usuário</Text>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.card}>
          <Ionicons name="cube-outline" size={32} color={COLORS.PRIMARY} />
          {loading ? (
            <ActivityIndicator color={COLORS.PRIMARY} style={{ marginVertical: 10 }} />
          ) : (
            <Text style={styles.cardValue}>{totalItems}</Text>
          )}
          <Text style={styles.cardLabel}>Itens Totais</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="checkmark-done-outline" size={32} color={COLORS.PRIMARY} />
          {loading ? (
            <ActivityIndicator color={COLORS.PRIMARY} style={{ marginVertical: 10 }} />
          ) : (
            <Text style={styles.cardValue}>{auditedItems}</Text>
          )}
          <Text style={styles.cardLabel}>Itens Auditados</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Ações Rápidas</Text>

      <TouchableOpacity style={styles.actionBtn} onPress={goToScanner}>
        <Ionicons name="camera-outline" size={24} color={COLORS.BLACK} />
        <Text style={styles.actionBtnText}>NOVO ESCANEAMENTO</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BLACK, padding: 20 },
  header: { marginTop: 50, marginBottom: 30, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' },
  menuBtn: { padding: 4 },
  profileBlock: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: COLORS.PRIMARY, backgroundColor: COLORS.DARK },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.DARK, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.PRIMARY },
  userName: { color: COLORS.WHITE, fontSize: 24, fontWeight: 'bold', marginTop: 14 },
  userRoleText: { color: COLORS.GRAY, marginTop: 6 },
  adminBadge: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.PRIMARY, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  adminBadgeText: { color: COLORS.BLACK, fontWeight: 'bold' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  card: { backgroundColor: COLORS.DARK, width: '48%', padding: 20, borderRadius: 20, alignItems: 'center' },
  cardValue: { color: COLORS.WHITE, fontSize: 28, fontWeight: 'bold', marginVertical: 10 },
  cardLabel: { color: COLORS.GRAY, fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { color: COLORS.WHITE, fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  actionBtn: { backgroundColor: COLORS.PRIMARY, padding: 18, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  actionBtnText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
});
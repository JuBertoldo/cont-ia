import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { handleExportCSV } from '../../services/ExportService'; // O serviço que você criou!

// --- 1. SUB-COMPONENTE: ADMIN (O que o chefe vê) ---
const AdminView = ({ navigation, userData }) => (
  <View style={styles.dashboard}>
    <Text style={styles.sectionTitle}>Painel de Controle</Text>
    
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>CSV</Text>
        <Text style={styles.statLabel}>Relatórios</Text>
      </View>
    </View>

    <TouchableOpacity style={styles.menuItem} onPress={() => handleExportCSV()}>
      <Ionicons name="download-outline" size={24} color="#00FF88" />
      <Text style={styles.menuText}>Exportar Inventário Geral</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('History')}>
      <Ionicons name="list-outline" size={24} color="#00FF88" />
      <Text style={styles.menuText}>Auditoria de Ativos</Text>
    </TouchableOpacity>
  </View>
);

// --- 2. SUB-COMPONENTE: USER (O que o colaborador vê) ---
const UserView = ({ navigation }) => (
  <View style={styles.dashboard}>
    <Text style={styles.sectionTitle}>Sua Operação</Text>
    
    <TouchableOpacity style={styles.mainButton} onPress={() => navigation.navigate('Scanner')}>
      <Ionicons name="camera" size={50} color="#000" />
      <Text style={styles.mainButtonText}>ESCANEAR NOVO ATIVO</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('History')}>
      <Ionicons name="time-outline" size={24} color="#00FF88" />
      <Text style={styles.menuText}>Meus Lançamentos</Text>
    </TouchableOpacity>
  </View>
);

// --- 3. COMPONENTE PRINCIPAL (A "Mente" do App) ---
export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const userDoc = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        Alert.alert("Erro", "Não foi possível carregar seu perfil.");
      } finally {
        setLoading(false);
      }
    }
    fetchUserData();
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#00FF88" size="large" /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header SRP */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Olá, {userData?.nome?.split(' ')[0] || 'Usuário'}</Text>
          <Text style={styles.roleBadge}>{userData?.role?.toUpperCase() || 'USER'}</Text>
        </View>
        <TouchableOpacity onPress={() => auth.signOut().then(() => navigation.replace('AuthHome'))}>
          <Ionicons name="log-out-outline" size={28} color="#FF4444" />
        </TouchableOpacity>
      </View>

      {/* LÓGICA DE DECISÃO (O que mostrar para quem?) */}
      {userData?.role === 'admin' 
        ? <AdminView navigation={navigation} userData={userData} /> 
        : <UserView navigation={navigation} />
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000', padding: 25 },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, marginBottom: 30 },
  welcome: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  roleBadge: { color: '#00FF88', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  dashboard: { width: '100%' },
  sectionTitle: { color: '#888', fontSize: 14, marginBottom: 20, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', backgroundColor: '#111', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 15 },
  menuText: { color: '#FFF', marginLeft: 15, fontSize: 16 },
  mainButton: { backgroundColor: '#00FF88', padding: 40, borderRadius: 25, alignItems: 'center', marginBottom: 25 },
  mainButtonText: { color: '#000', fontWeight: 'bold', marginTop: 10, fontSize: 16 },
  statsRow: { flexDirection: 'row', marginBottom: 20 },
  statCard: { backgroundColor: '#111', padding: 20, borderRadius: 15, alignItems: 'center', width: '100%' },
  statNumber: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12 }
});
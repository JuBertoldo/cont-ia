import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, ScrollView } from 'react-native';

export default function HomeScreen({ navigation }) {
  // Simulação de dados que virão do banco futuramente
  const stats = { 
    totalLotes: 12, 
    totalPecas: 450, 
    maisContado: 'Sextavado',
    qtdMaisContado: 180 
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.logoText}>CONT.<Text style={{color: '#00FF88'}}>IA</Text></Text>
        <Text style={styles.userText}>Operador: João Silva</Text>
      </View>

      {/* CARD DE RESUMO (O DESTAQUE) */}
      <View style={styles.highlightCard}>
        <View>
          <Text style={styles.highlightLabel}>ITEM MAIS DETECTADO</Text>
          <Text style={styles.highlightValue}>{stats.maisContado.toUpperCase()}</Text>
          <Text style={styles.highlightSub}>{stats.qtdMaisContado} unidades hoje</Text>
        </View>
        <View style={styles.highlightBadge}>
          <Text style={styles.badgeText}>🏆</Text>
        </View>
      </View>

      {/* STATS RÁPIDAS */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalLotes}</Text>
          <Text style={styles.statLabel}>LOTES</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalPecas}</Text>
          <Text style={styles.statLabel}>TOTAL</Text>
        </View>
      </View>

      {/* BOTÕES DE AÇÃO */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.mainButton}
          onPress={() => navigation.navigate('Scanner')}
        >
          <Text style={styles.buttonIcon}>📷</Text>
          <Text style={styles.buttonText}>INICIAR SCANNER</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.buttonTextSec}>HISTÓRICO COMPLETO</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', padding: 20 },
  header: { marginTop: 40, marginBottom: 25 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  userText: { color: '#666', fontSize: 12 },

  highlightCard: {
    backgroundColor: '#111',
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  highlightLabel: { color: '#888', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  highlightValue: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 5 },
  highlightSub: { color: '#00FF88', fontSize: 12, marginTop: 5 },
  highlightBadge: { backgroundColor: 'rgba(0, 255, 136, 0.1)', padding: 15, borderRadius: 50 },
  badgeText: { fontSize: 24 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { backgroundColor: '#111', width: '48%', padding: 20, borderRadius: 15, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#444', fontSize: 9, fontWeight: 'bold', marginTop: 5 },

  actionContainer: { width: '100%', maxWidth: 500, alignSelf: 'center' },
  mainButton: { backgroundColor: '#00FF88', padding: 25, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  buttonIcon: { fontSize: 20, marginRight: 15 },
  buttonText: { color: '#000', fontWeight: '900', fontSize: 16 },
  secondaryButton: { backgroundColor: '#1A1A1A', padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  buttonTextSec: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
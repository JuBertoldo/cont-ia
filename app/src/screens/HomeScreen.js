import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation }) {
  // Estado que vai guardar os números reais
  const [stats, setStats] = useState({ 
    totalLotes: 0, 
    totalPecas: 0, 
    maisContado: '-',
    qtdMaisContado: 0 
  });

  // 🔄 Toda vez que a tela da Home aparecer, ele recalcula os dados!
  useFocusEffect(
    useCallback(() => {
      calcularEstatisticas();
    }, [])
  );

  const calcularEstatisticas = async () => {
    try {
      const dadosSalvos = await AsyncStorage.getItem('@contia_historico');
      if (dadosSalvos) {
        const historico = JSON.parse(dadosSalvos);
        
        if (historico.length === 0) {
          // Se o histórico estiver vazio, zera tudo
          setStats({ totalLotes: 0, totalPecas: 0, maisContado: 'NENHUM', qtdMaisContado: 0 });
          return;
        }

        // 1. Calcula Lotes (Total de itens na lista)
        const lotes = historico.length;

        // 2. Calcula Total de Peças (Soma a 'quantity' de todos)
        const pecas = historico.reduce((soma, item) => soma + item.quantity, 0);

        // 3. Descobre o item mais contado
        const contagemPorItem = {};
        historico.forEach(item => {
          if (contagemPorItem[item.itemName]) {
            contagemPorItem[item.itemName] += item.quantity;
          } else {
            contagemPorItem[item.itemName] = item.quantity;
          }
        });

        // Acha o campeão
        let nomeCampeao = '-';
        let qtdCampeao = 0;
        for (const [nome, qtd] of Object.entries(contagemPorItem)) {
          if (qtd > qtdCampeao) {
            qtdCampeao = qtd;
            nomeCampeao = nome;
          }
        }

        // Atualiza a tela com os dados REAIS!
        setStats({
          totalLotes: lotes,
          totalPecas: pecas,
          maisContado: nomeCampeao,
          qtdMaisContado: qtdCampeao
        });
      }
    } catch (error) {
      console.log("Erro ao calcular estatísticas", error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.logoText}>
            CONT.<Text style={{color: '#00FF88'}}>IA</Text>
          </Text>
          <Text style={styles.userText}>Operador: João Silva</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.replace('Login')}>
          <Text style={styles.logoutText}>SAIR</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.highlightCard}>
        <View>
          <Text style={styles.highlightLabel}>ITEM MAIS DETECTADO</Text>
          <Text style={styles.highlightValue}>{stats.maisContado.toUpperCase()}</Text>
          <Text style={styles.highlightSub}>{stats.qtdMaisContado} unidades no total</Text>
        </View>
        <View style={styles.highlightBadge}>
          <Text style={styles.badgeText}>🏆</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalLotes}</Text>
          <Text style={styles.statLabel}>LOTES SCANNEADOS</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalPecas}</Text>
          <Text style={styles.statLabel}>TOTAL DE PEÇAS</Text>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.mainButton} onPress={() => navigation.navigate('Scanner')}>
          <Text style={styles.buttonIcon}>📷</Text>
          <Text style={styles.buttonText}>INICIAR SCANNER</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('History')}>
          <Text style={styles.buttonTextSec}>HISTÓRICO COMPLETO</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 25 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  userText: { color: '#666', fontSize: 12 },
  logoutButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255, 59, 48, 0.1)', borderWidth: 1, borderColor: '#FF3B30' },
  logoutText: { color: '#FF3B30', fontSize: 11, fontWeight: '900' },
  highlightCard: { backgroundColor: '#111', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#222', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  highlightLabel: { color: '#888', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  highlightValue: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 5 },
  highlightSub: { color: '#00FF88', fontSize: 12, marginTop: 5 },
  highlightBadge: { backgroundColor: 'rgba(0, 255, 136, 0.1)', padding: 15, borderRadius: 50 },
  badgeText: { fontSize: 24 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { backgroundColor: '#111', width: '48%', padding: 20, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  statValue: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  statLabel: { color: '#666', fontSize: 9, fontWeight: 'bold', marginTop: 5 },
  actionContainer: { width: '100%', maxWidth: 500, alignSelf: 'center' },
  mainButton: { backgroundColor: '#00FF88', padding: 25, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  buttonIcon: { fontSize: 20, marginRight: 15 },
  buttonText: { color: '#000', fontWeight: '900', fontSize: 16 },
  secondaryButton: { backgroundColor: '#1A1A1A', padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  buttonTextSec: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
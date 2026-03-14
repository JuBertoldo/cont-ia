import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({ lotes: 0, total: 0, recNome: '---', recQtd: 0 });

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const salvo = await AsyncStorage.getItem('@contia_history');
        if (salvo) {
          const hist = JSON.parse(salvo);
          const total = hist.reduce((acc, i) => acc + i.quantity, 0);
          const rec = hist.length > 0 ? hist.reduce((p, c) => (p.quantity > c.quantity) ? p : c) : null;
          setStats({ lotes: hist.length, total, recNome: rec ? rec.itemName : '---', recQtd: rec ? rec.quantity : 0 });
        }
      };
      load();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>CONT.<Text style={{color:'#00FF88'}}>IA</Text></Text>
        <TouchableOpacity style={styles.logout}><Ionicons name="log-out-outline" size={24} color="#fff" /></TouchableOpacity>
      </View>

      <View style={styles.recCard}>
        <View>
          <Text style={styles.label}>RECORDE DE CONTAGEM</Text>
          <Text style={styles.val}>{stats.recNome.toUpperCase()}</Text>
          <Text style={styles.sub}>{stats.recQtd} Unidades Acumuladas</Text>
        </View>
        <Ionicons name="trophy" size={40} color="#00FF88" />
      </View>

      <View style={styles.grid}>
        <View style={styles.box}><Text style={styles.num}>{stats.lotes}</Text><Text style={styles.label}>LOTES REGISTRADOS</Text></View>
        <View style={styles.box}><Text style={styles.num}>{stats.total}</Text><Text style={styles.label}>TOTAL REGISTRADO</Text></View>
      </View>

      <TouchableOpacity style={styles.btn1} onPress={() => navigation.navigate('Scanner')}>
        <Ionicons name="camera" size={24} color="#000" /><Text style={styles.btxt}>INICIAR SCANNER IA</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn2}><Text style={styles.btxt}>EXPORTAR RELATÓRIO EXCEL</Text></TouchableOpacity>
      <TouchableOpacity style={styles.btn3} onPress={() => navigation.navigate('History')}><Text style={{color:'#fff'}}>HISTÓRICO COMPLETO</Text></TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 20 },
  logo: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  logout: { backgroundColor: '#121212', padding: 10, borderRadius: 10 },
  recCard: { backgroundColor: '#121212', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { color: '#666', fontSize: 9, fontWeight: 'bold' },
  val: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginVertical: 4 },
  sub: { color: '#00FF88', fontSize: 12 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  box: { backgroundColor: '#121212', width: '48%', aspectRatio: 1, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  num: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  btn1: { backgroundColor: '#00FF88', padding: 20, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  btn2: { backgroundColor: '#FFC107', padding: 20, borderRadius: 15, justifyContent: 'center', marginBottom: 10 },
  btn3: { padding: 15, alignItems: 'center' },
  btxt: { fontWeight: 'bold', fontSize: 16, marginLeft: 10 }
});
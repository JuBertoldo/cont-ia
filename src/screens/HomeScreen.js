import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Firebase
import { db } from '../config/firebaseConfig';
import { collection, query, onSnapshot } from 'firebase/firestore';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [stats, setStats] = useState({ totalLotes: 0, totalItens: 0, recordeNome: '-' });

  useEffect(() => {
    // Escuta o banco de dados em tempo real
    const q = query(collection(db, "inventario"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let lotes = querySnapshot.size;
      let total = 0;
      let contagemNomes = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        total += data.quantity || 0;
        
        const nome = data.itemName || 'SEM NOME';
        contagemNomes[nome] = (contagemNomes[nome] || 0) + (data.quantity || 0);
      });

      // Calcula o item recordista
      let recorde = '-';
      let maxQtd = 0;
      for (const [nome, qtd] of Object.entries(contagemNomes)) {
        if (qtd > maxQtd) {
          maxQtd = qtd;
          recorde = nome;
        }
      }

      setStats({
        totalLotes: lotes,
        totalItens: total,
        recordeNome: recorde
      });
    }, (error) => {
      console.error("Erro ao sincronizar Home:", error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>CONT.IA</Text>
      </View>

      <View style={styles.cardDestaque}>
        <View style={{ flex: 1 }}>
          <Text style={styles.labelDestaque}>RECORDE DE CONTAGEM</Text>
          <Text style={styles.valorDestaque}>{stats.recordeNome}</Text>
          <Text style={styles.subDestaque}>{stats.totalItens} Unidades no Total</Text>
        </View>
        <Ionicons name="trophy" size={50} color="#00FF88" />
      </View>

      <View style={styles.row}>
        <View style={styles.cardPequeno}>
          <Text style={styles.numPequeno}>{stats.totalLotes}</Text>
          <Text style={styles.labelPequeno}>LOTES REGISTRADOS</Text>
        </View>
        <View style={styles.cardPequeno}>
          <Text style={styles.numPequeno}>{stats.totalItens}</Text>
          <Text style={styles.labelPequeno}>TOTAL DE ITENS</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.btnScanner} onPress={() => navigation.navigate('Scanner')}>
        <Ionicons name="camera" size={24} color="black" />
        <Text style={styles.btnText}> INICIAR SCANNER IA</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnExcel} onPress={() => Alert.alert("Em breve", "Função de exportação em desenvolvimento.")}>
        <Text style={styles.btnTextExcel}>EXPORTAR RELATÓRIO EXCEL</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('History')}>
        <Text style={styles.linkHistorico}>VER HISTÓRICO COMPLETO</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  header: { marginTop: 40, marginBottom: 30 },
  logo: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  cardDestaque: { backgroundColor: '#111', padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  labelDestaque: { color: '#888', fontSize: 12 },
  valorDestaque: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginVertical: 5 },
  subDestaque: { color: '#00FF88', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  cardPequeno: { backgroundColor: '#111', width: '48%', padding: 20, borderRadius: 20, alignItems: 'center' },
  numPequeno: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  labelPequeno: { color: '#888', fontSize: 10, textAlign: 'center' },
  btnScanner: { backgroundColor: '#00FF88', padding: 18, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  btnText: { fontWeight: 'bold', fontSize: 16 },
  btnExcel: { backgroundColor: '#FFB800', padding: 18, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  btnTextExcel: { fontWeight: 'bold', fontSize: 16 },
  linkHistorico: { color: '#888', textAlign: 'center', fontSize: 14, textDecorationLine: 'underline', marginBottom: 40 }
});
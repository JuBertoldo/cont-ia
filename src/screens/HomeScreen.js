import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Ferramentas de Excel
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Firebase
import { db, auth } from '../config/firebaseConfig'; // Importamos o auth aqui
import { collection, query, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [stats, setStats] = useState({ totalLotes: 0, totalItens: 0, recordeNome: '-' });
  const [exporting, setExporting] = useState(false);

  // Monitora o banco de dados em tempo real
  useEffect(() => {
    const q = query(collection(db, "inventario"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let total = 0;
      let contagemNomes = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const qtd = Number(data.quantity) || 0;
        total += qtd;
        const nome = data.itemName || 'SEM NOME';
        // Soma as quantidades de itens com o mesmo nome
        contagemNomes[nome] = (contagemNomes[nome] || 0) + qtd;
      });

      // Lógica do Recorde: Encontrar o nome com maior soma de quantidades
      let recorde = '-';
      let maxQtd = 0;
      for (const [nome, qtd] of Object.entries(contagemNomes)) {
        if (qtd > maxQtd) {
          maxQtd = qtd;
          recorde = nome;
        }
      }

      setStats({
        totalLotes: querySnapshot.size,
        totalItens: total,
        recordeNome: recorde
      });
    });
    return () => unsubscribe();
  }, []);

  // Função para Sair do App
  const handleLogout = () => {
    Alert.alert("Sair", "Deseja realmente sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", onPress: () => signOut(auth).then(() => navigation.replace('Login')) }
    ]);
  };

  const exportarExcel = async () => {
    setExporting(true);
    try {
      const q = query(collection(db, "inventario"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const dadosPlanilha = snapshot.docs.map(doc => ({
        'ITEM': doc.data().itemName,
        'QUANTIDADE': doc.data().quantity,
        'DATA': doc.data().date,
        'ID': doc.id
      }));

      if (dadosPlanilha.length === 0) {
        Alert.alert("Aviso", "Inventário vazio.");
        setExporting(false);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(dadosPlanilha);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");
      const wbout = XLSX.write(wb, { type: 'base64', bookType: "xlsx" });
      const uri = FileSystem.cacheDirectory + 'Relatorio_ContIA.xlsx';

      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: 'base64' });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exportar Inventário'
      });
    } catch (error) {
      Alert.alert("Erro", "Falha ao gerar Excel.");
    } finally { setExporting(false); }
  };

  return (
    <ScrollView style={styles.container}>
      {/* CABEÇALHO COM BOTÃO SAIR */}
      <View style={styles.header}>
        <Text style={styles.logo}>CONT.IA</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={28} color="white" />
        </TouchableOpacity>
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

      <TouchableOpacity 
        style={[styles.btnExcel, exporting && { opacity: 0.6 }]} 
        onPress={exportarExcel}
        disabled={exporting}
      >
        {exporting ? <ActivityIndicator color="black" /> : <Text style={styles.btnTextExcel}>EXPORTAR RELATÓRIO EXCEL</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('History')}>
        <Text style={styles.linkHistorico}>VER HISTÓRICO COMPLETO</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  header: { marginTop: 40, marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  btnText: { fontWeight: 'bold', fontSize: 16, color: 'black' },
  btnExcel: { backgroundColor: '#FFB800', padding: 18, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  btnTextExcel: { fontWeight: 'bold', fontSize: 16, color: 'black' },
  linkHistorico: { color: '#888', textAlign: 'center', fontSize: 14, textDecorationLine: 'underline', marginBottom: 40 }
});
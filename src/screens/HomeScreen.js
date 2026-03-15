import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Ferramentas para o Excel
import * as XLSX from 'xlsx';
// IMPORTANTE: Mudamos para /legacy para aceitar o método writeAsStringAsync
import * as FileSystem from 'expo-file-system/legacy'; 
import * as Sharing from 'expo-sharing';

// Firebase
import { db } from '../config/firebaseConfig';
import { collection, query, onSnapshot, getDocs, orderBy } from 'firebase/firestore';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [stats, setStats] = useState({ totalLotes: 0, totalItens: 0, recordeNome: '-' });
  const [exporting, setExporting] = useState(false);

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
        contagemNomes[nome] = (contagemNomes[nome] || 0) + qtd;
      });

      let recorde = '-';
      let maxQtd = 0;
      for (const [nome, qtd] of Object.entries(contagemNomes)) {
        if (qtd > maxQtd) { maxQtd = qtd; recorde = nome; }
      }
      setStats({ totalLotes: querySnapshot.size, totalItens: total, recordeNome: recorde });
    });
    return () => unsubscribe();
  }, []);

  const exportarExcel = async () => {
    setExporting(true);
    try {
      const q = query(collection(db, "inventario"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      const dadosPlanilha = snapshot.docs.map(doc => ({
        'ITEM': doc.data().itemName,
        'QUANTIDADE': doc.data().quantity,
        'DATA': doc.data().date,
        'ID_SISTEMA': doc.id
      }));

      if (dadosPlanilha.length === 0) {
        Alert.alert("Aviso", "Nada para exportar.");
        setExporting(false);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(dadosPlanilha);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");

      const wbout = XLSX.write(wb, { type: 'base64', bookType: "xlsx" });
      const uri = FileSystem.cacheDirectory + 'Relatorio_ContIA.xlsx';

      // Usando o modo legacy agora ele vai reconhecer o comando corretamente
      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: 'base64'
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exportar Inventário',
        UTI: 'com.microsoft.excel.xlsx'
      });

    } catch (error) {
      console.log("Erro detalhado:", error);
      Alert.alert("Erro", "Não foi possível gerar o arquivo.");
    } finally {
      setExporting(false);
    }
  };

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

      <TouchableOpacity 
        style={[styles.btnExcel, exporting && { opacity: 0.6 }]} 
        onPress={exportarExcel}
        disabled={exporting}
      >
        {exporting ? (
          <ActivityIndicator color="black" />
        ) : (
          <Text style={styles.btnTextExcel}>EXPORTAR RELATÓRIO EXCEL</Text>
        )}
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
  btnText: { fontWeight: 'bold', fontSize: 16, color: 'black' },
  btnExcel: { backgroundColor: '#FFB800', padding: 18, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  btnTextExcel: { fontWeight: 'bold', fontSize: 16, color: 'black' },
  linkHistorico: { color: '#888', textAlign: 'center', fontSize: 14, textDecorationLine: 'underline', marginBottom: 40 }
});
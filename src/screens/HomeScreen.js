import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Scrollview } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Firebase
import { auth, db } from '../config/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function HomeScreen({ navigation }) {
  const [totalLotes, setTotalLotes] = useState(0);
  const [totalItens, setTotalItens] = useState(0);
  const [recordeNome, setRecordeNome] = useState("-");
  const [recordeQtd, setRecordeQtd] = useState(0);

  // 1. Identificando o usuário atual
  const usuarioLogado = auth.currentUser;

  useEffect(() => {
    if (!usuarioLogado) return;

    // 2. Buscando apenas os dados do usuário logado para os cards
    const q = query(
      collection(db, "inventario"),
      where("userId", "==", usuarioLogado.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let lotes = snapshot.size;
      let itens = 0;
      let maiorQtd = 0;
      let nomeMaior = "-";

      snapshot.forEach((doc) => {
        const data = doc.data();
        const qtd = Number(data.quantity) || 0;
        itens += qtd;

        if (qtd > maiorQtd) {
          maiorQtd = qtd;
          nomeMaior = data.itemName;
        }
      });

      setTotalLotes(lotes);
      setTotalItens(itens);
      setRecordeNome(nomeMaior);
      setRecordeQtd(maiorQtd);
    });

    return () => unsubscribe();
  }, [usuarioLogado]);

  const handleLogout = () => {
    auth.signOut().then(() => navigation.replace('Login'));
  };

  return (
    <View style={styles.container}>
      {/* HEADER COM IDENTIFICAÇÃO DO USUÁRIO */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>CONT.IA</Text>
          {/* AQUI APARECE QUEM ESTÁ LOGADO */}
          <Text style={styles.userEmail}>Olá, {usuarioLogado?.email.split('@')[0]}</Text> 
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* RECORDE */}
      <View style={styles.recordCard}>
        <View>
          <Text style={styles.recordLabel}>RECORDE DE CONTAGEM</Text>
          <Text style={styles.recordName}>{recordeNome}</Text>
          <Text style={styles.recordQty}>{recordeQtd} Unidades no Total</Text>
        </View>
        <Ionicons name="trophy" size={50} color="#00FF88" />
      </View>

      {/* CARDS DE STATS */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalLotes}</Text>
          <Text style={styles.statLabel}>LOTES REGISTRADOS</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalItens}</Text>
          <Text style={styles.statLabel}>TOTAL DE ITENS</Text>
        </View>
      </View>

      {/* BOTÕES PRINCIPAIS */}
      <TouchableOpacity 
        style={styles.btnScanner} 
        onPress={() => navigation.navigate('Scanner')} // Verifique se o nome da rota está correto
      >
        <Ionicons name="camera" size={24} color="black" style={{marginRight: 10}} />
        <Text style={styles.btnScannerText}>INICIAR SCANNER IA</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnExcel}>
        <Text style={styles.btnExcelText}>EXPORTAR RELATÓRIO EXCEL</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('History')}>
        <Text style={styles.btnHistory}>VER HISTÓRICO COMPLETO</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  logo: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  userEmail: { color: '#888', fontSize: 14, marginTop: 4 },
  recordCard: { backgroundColor: '#111', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  recordLabel: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  recordName: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginVertical: 5 },
  recordQty: { color: '#00FF88', fontSize: 14 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { backgroundColor: '#111', borderRadius: 20, padding: 20, width: '48%', alignItems: 'center' },
  statNumber: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  statLabel: { color: '#666', fontSize: 10, textAlign: 'center', marginTop: 5 },
  btnScanner: { backgroundColor: '#00FF88', padding: 20, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  btnScannerText: { fontWeight: 'bold', fontSize: 16 },
  btnExcel: { backgroundColor: '#FFB800', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  btnExcelText: { fontWeight: 'bold', fontSize: 16 },
  btnHistory: { color: '#666', textAlign: 'center', textDecorationLine: 'underline' }
});
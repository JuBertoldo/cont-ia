import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  Alert, 
  Dimensions 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({ 
    totalLotes: 0, 
    totalPecas: 0, 
    maisContado: '-',
    qtdMaisContado: 0 
  });
  const [historicoBruto, setHistoricoBruto] = useState([]);

  // 🔄 Recarrega os dados toda vez que você volta para esta tela
  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = async () => {
    try {
      const dadosSalvos = await AsyncStorage.getItem('@contia_historico');
      if (dadosSalvos) {
        const historico = JSON.parse(dadosSalvos);
        setHistoricoBruto(historico);
        
        if (historico.length === 0) {
          setStats({ totalLotes: 0, totalPecas: 0, maisContado: 'NENHUM', qtdMaisContado: 0 });
          return;
        }

        // Cálculos de Lotes e Peças
        const lotes = historico.length;
        const pecas = historico.reduce((soma, item) => soma + item.quantity, 0);

        // Acha o campeão de contagem
        const contagemPorItem = {};
        historico.forEach(item => {
          contagemPorItem[item.itemName] = (contagemPorItem[item.itemName] || 0) + item.quantity;
        });

        let nomeCampeao = '-';
        let qtdCampeao = 0;
        for (const [nome, qtd] of Object.entries(contagemPorItem)) {
          if (qtd > qtdCampeao) {
            qtdCampeao = qtd;
            nomeCampeao = nome;
          }
        }

        setStats({
          totalLotes: lotes,
          totalPecas: pecas,
          maisContado: nomeCampeao,
          qtdMaisContado: qtdCampeao
        });
      }
    } catch (error) {
      console.error("Erro ao processar dados da Home:", error);
    }
  };

  // 📊 FUNÇÃO DE EXPORTAR EXCEL (CSV)
  const exportarRelatorio = () => {
    if (historicoBruto.length === 0) {
      Alert.alert("Atenção", "O inventário está vazio.");
      return;
    }

    let csvContent = "Item;Quantidade;Horario;Metodo\n";
    historicoBruto.forEach(item => {
      csvContent += `${item.itemName};${item.quantity};${item.date};${item.confidence}\n`;
    });

    // Lógica para download no Navegador/Web
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ContIA_Inventario_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Alert.alert("Sucesso!", "O arquivo CSV foi enviado para sua pasta de Downloads.");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <StatusBar barStyle="light-content" />

      {/* Header Profissional */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.logoText}>CONT.<Text style={{color: '#00FF88'}}>IA</Text></Text>
          <Text style={styles.userText}>Operador logado: João Silva</Text>
        </View>
        <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('History')}>
          <Ionicons name="list" size={20} color="#00FF88" />
        </TouchableOpacity>
      </View>

      {/* Card de Destaque */}
      <View style={styles.highlightCard}>
        <View style={{flex: 1}}>
          <Text style={styles.highlightLabel}>RECORDE DE CONTAGEM</Text>
          <Text style={styles.highlightValue}>{stats.maisContado.toUpperCase()}</Text>
          <Text style={styles.highlightSub}>{stats.qtdMaisContado} Unidades Acumuladas</Text>
        </View>
        <View style={styles.highlightBadge}>
          <Ionicons name="trophy" size={30} color="#00FF88" />
        </View>
      </View>

      {/* Grid de Estatísticas */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalLotes}</Text>
          <Text style={styles.statLabel}>LOTES REGISTRADOS</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalPecas}</Text>
          <Text style={styles.statLabel}>TOTAL DE PEÇAS</Text>
        </View>
      </View>

      {/* Área de Ações Principais */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.mainButton} 
          onPress={() => navigation.navigate('Scanner')}
        >
          <Ionicons name="camera" size={24} color="#000" style={{marginRight: 15}} />
          <Text style={styles.buttonText}>INICIAR SCANNER IA</Text>
        </TouchableOpacity>

        {historicoBruto.length > 0 && (
          <TouchableOpacity style={styles.exportButton} onPress={exportarRelatorio}>
            <Ionicons name="download-outline" size={20} color="#fff" style={{marginRight: 10}} />
            <Text style={styles.buttonTextSec}>EXPORTAR RELATÓRIO EXCEL</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.historySecondary} 
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.buttonTextSec}>ACESSAR HISTÓRICO COMPLETO</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 30 },
  logoText: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 1 },
  userText: { color: '#666', fontSize: 12, marginTop: 2 },
  historyBtn: { backgroundColor: '#111', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
  
  highlightCard: { backgroundColor: '#111', padding: 25, borderRadius: 25, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  highlightLabel: { color: '#888', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5 },
  highlightValue: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 8 },
  highlightSub: { color: '#00FF88', fontSize: 13, marginTop: 5, fontWeight: '600' },
  highlightBadge: { backgroundColor: 'rgba(0, 255, 136, 0.05)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 255, 136, 0.2)' },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { backgroundColor: '#111', width: '48%', padding: 25, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  statValue: { color: '#fff', fontSize: 28, fontWeight: '900' },
  statLabel: { color: '#555', fontSize: 9, fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
  
  actionContainer: { width: '100%', gap: 12 },
  mainButton: { backgroundColor: '#00FF88', padding: 22, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#00FF88', shadowRadius: 10, shadowOpacity: 0.2 },
  buttonText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  
  exportButton: { backgroundColor: '#FFBB00', padding: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  historySecondary: { backgroundColor: '#1A1A1A', padding: 18, borderRadius: 18, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  buttonTextSec: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
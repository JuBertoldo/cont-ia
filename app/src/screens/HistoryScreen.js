import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// 📦 DADOS INICIAIS (Para termos o que apagar no primeiro teste)
// Adicionei a propriedade "quantity" (quantidade) para a Home conseguir calcular o Total!
const DADOS_INICIAIS = [
  { id: '1', itemName: 'Parafuso Sextavado', quantity: 150, confidence: '98%', date: '13/03/2026 08:00', imageUri: 'https://images.unsplash.com/photo-1585202656335-519a48f41348?w=200&h=200&fit=crop' },
  { id: '2', itemName: 'Porca M8', quantity: 300, confidence: '85%', date: '12/03/2026 15:30', imageUri: 'https://images.unsplash.com/photo-1601007629562-b1d5c7f8a7e0?w=200&h=200&fit=crop' },
  { id: '3', itemName: 'Parafuso Sextavado', quantity: 50, confidence: '92%', date: '11/03/2026 10:20', imageUri: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=200&h=200&fit=crop' }
];

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);

  // 🔄 Essa função roda SEMPRE que você entra nesta tela
  useFocusEffect(
    useCallback(() => {
      carregarHistorico();
    }, [])
  );

  const carregarHistorico = async () => {
    try {
      const dadosSalvos = await AsyncStorage.getItem('@contia_historico');
      if (dadosSalvos !== null) {
        setHistory(JSON.parse(dadosSalvos));
      } else {
        // Se for a primeira vez abrindo o app, salva os dados falsos para testarmos
        await AsyncStorage.setItem('@contia_historico', JSON.stringify(DADOS_INICIAIS));
        setHistory(DADOS_INICIAIS);
      }
    } catch (error) {
      console.log("Erro ao carregar histórico", error);
    }
  };

  // 🗑️ FUNÇÃO DE APAGAR O ITEM
  const apagarItem = async (idParaApagar) => {
    // Filtra a lista mantendo apenas os que NÃO tem o ID clicado
    const novaLista = history.filter(item => item.id !== idParaApagar);
    
    // Atualiza a tela na mesma hora
    setHistory(novaLista);
    
    // Salva a nova lista no "disco rígido"
    await AsyncStorage.setItem('@contia_historico', JSON.stringify(novaLista));
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <Text style={styles.confidence}>Qtd: {item.quantity} | IA: {item.confidence}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => apagarItem(item.id)}>
        <Text style={styles.deleteText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Nenhum item escaneado ainda.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', paddingTop: 20 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 15, padding: 15, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  cardImage: { width: 70, height: 70, borderRadius: 10, backgroundColor: '#333' },
  cardContent: { flex: 1, marginLeft: 15 },
  itemName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  confidence: { color: '#00FF88', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  date: { color: '#666', fontSize: 12 },
  deleteButton: { padding: 12, backgroundColor: 'rgba(255, 59, 48, 0.1)', borderRadius: 10, borderWidth: 1, borderColor: '#FF3B30' },
  deleteText: { fontSize: 20 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 50, marginBottom: 10 },
  emptyText: { color: '#888', fontSize: 16 }
});
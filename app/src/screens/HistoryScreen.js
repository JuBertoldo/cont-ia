import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // Importamos os ícones

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);

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
      }
    } catch (error) {
      console.log("Erro ao carregar histórico", error);
    }
  };

  const apagarItem = async (idParaApagar) => {
    const novaLista = history.filter(item => item.id !== idParaApagar);
    setHistory(novaLista);
    await AsyncStorage.setItem('@contia_historico', JSON.stringify(novaLista));
  };

  // Função que decide o que mostrar no lugar da foto
  const renderThumbnail = (item) => {
    if (item.imageUri) {
      return <Image source={{ uri: item.imageUri }} style={styles.cardImage} />;
    } else {
      // Se a imagem for NULL, mostra esse ícone neon
      return (
        <View style={styles.iconPlaceholder}>
          <Ionicons name="cube-outline" size={30} color="#00FF88" />
        </View>
      );
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Chama a função que criamos acima */}
      {renderThumbnail(item)}

      <View style={styles.cardContent}>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <Text style={styles.confidence}>Qtd: {item.quantity} | IA: {item.confidence || 'Google'}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={() => apagarItem(item.id)}>
        <Ionicons name="trash-outline" size={22} color="#FF3B30" />
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
            <Ionicons name="folder-open-outline" size={60} color="#333" />
            <Text style={styles.emptyText}>Nenhum item escaneado ainda.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', paddingTop: 10 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#111', 
    borderRadius: 15, 
    padding: 15, 
    marginBottom: 15, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#222' 
  },
  cardImage: { 
    width: 65, 
    height: 65, 
    borderRadius: 12 
  },
  iconPlaceholder: { 
    width: 65, 
    height: 65, 
    borderRadius: 12, 
    backgroundColor: '#1A1A1A', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  cardContent: { flex: 1, marginLeft: 15 },
  itemName: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  confidence: { color: '#00FF88', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  date: { color: '#666', fontSize: 11 },
  deleteButton: { 
    padding: 10, 
    backgroundColor: 'rgba(255, 59, 48, 0.05)', 
    borderRadius: 10 
  },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#444', fontSize: 16, marginTop: 15 }
});
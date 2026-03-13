import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';

// 📦 DADOS FALSOS (Mock) - Só para testarmos o layout!
// Depois vamos puxar isso do armazenamento real do celular.
const MOCK_HISTORY = [
  {
    id: '1',
    itemName: 'Notebook',
    confidence: '98%',
    date: '12/03/2026 21:00',
    imageUri: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop', // Imagem da internet
  },
  {
    id: '2',
    itemName: 'Garrafa de Água',
    confidence: '85%',
    date: '12/03/2026 20:30',
    imageUri: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=200&h=200&fit=crop',
  },
  {
    id: '3',
    itemName: 'Teclado Mecânico',
    confidence: '92%',
    date: '11/03/2026 15:20',
    imageUri: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=200&h=200&fit=crop',
  }
];

export default function HistoryScreen() {
  
  // 🎨 FUNÇÃO QUE DESENHA CADA "CARTÃO" DA LISTA
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
      
      <View style={styles.cardContent}>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <Text style={styles.confidence}>Precisão IA: {item.confidence}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>

      <TouchableOpacity style={styles.deleteButton}>
        <Text style={styles.deleteText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Meus Scans</Text>
      
      {/* O MOTOR DA LISTA */}
      <FlatList
        data={MOCK_HISTORY}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        // Se a lista estiver vazia (quando apagarmos os Mocks), ele mostra isso:
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

// 💅 ESTILOS (Deixando com cara de App Premium)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Fundo escuro moderno
    paddingTop: 50,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5, // Sombra no Android
  },
  cardImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  cardContent: {
    flex: 1,
    marginLeft: 15,
  },
  itemName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  confidence: {
    color: '#0f0', // Verdinho estilo IA
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    color: '#888',
    fontSize: 12,
  },
  deleteButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.1)', // Vermelhinho bem suave
    borderRadius: 10,
  },
  deleteText: {
    fontSize: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  }
});
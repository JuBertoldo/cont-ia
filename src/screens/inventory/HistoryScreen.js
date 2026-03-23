import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { db, auth } from '../../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';

export default function HistoryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let unsubscribe;

    const setupHistory = async () => {
      try {
        // 1. Verifica o papel (Role) do usuário logado
        const userDoc = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
        const role = userDoc.data()?.role || 'user';
        const adminStatus = role === 'admin';
        setIsAdmin(adminStatus);

        // 2. Define a Query baseada no perfil (RBAC)
        const ativosRef = collection(db, "ativos");
        const q = adminStatus 
          ? query(ativosRef, orderBy("createdAt", "desc"))
          : query(ativosRef, where("userId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));

        // 3. Escuta o banco em tempo real
        unsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setItems(data);
          setLoading(false);
        }, (error) => {
          console.error("Erro no Snapshot:", error);
          setLoading(false);
        });

      } catch (error) {
        console.error("Erro ao configurar histórico:", error);
        setLoading(false);
      }
    };

    setupHistory();

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Função para deletar item (Apenas Admin)
  const handleDelete = (itemId) => {
    Alert.alert(
      "Confirmar Exclusão",
      "Deseja remover este registro permanentemente?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "ativos", itemId));
            } catch (error) {
              Alert.alert("Erro", "Você não tem permissão para excluir.");
            }
          } 
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Exibição da Imagem (Prova Digital) */}
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
      )}

      <View style={styles.cardHeader}>
        <Text style={styles.itemName}>{item.nome || 'Item sem nome'}</Text>
        <Text style={styles.itemQty}>{item.quantidade || 1} un.</Text>
      </View>
      
      <View style={styles.detailsRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.classificacao || 'Geral'}</Text>
        </View>
        <Text style={styles.dateText}>
          {item.createdAt ? item.createdAt.toDate().toLocaleDateString('pt-BR') : 'Processando...'}
        </Text>
      </View>

      {/* Rodapé do Admin com Nome do Usuário e Botão Deletar */}
      {isAdmin && (
        <View style={styles.adminFooter}>
          <View style={styles.userInfo}>
            <Ionicons name="person-circle-outline" size={16} color="#888" />
            <Text style={styles.userName}>{item.userName || 'Colaborador'}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#FF4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#00FF88" />
        </TouchableOpacity>
        <Text style={styles.title}>{isAdmin ? "Auditoria Global" : "Meus Lançamentos"}</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#00FF88" size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum ativo encontrado.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  title: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginLeft: 15 },
  list: { paddingBottom: 20 },
  card: { backgroundColor: '#111', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  itemImage: { width: '100%', height: 160, borderRadius: 10, marginBottom: 12, backgroundColor: '#222' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  itemQty: { color: '#00FF88', fontWeight: 'bold' },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { backgroundColor: '#222', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#888', fontSize: 11, textTransform: 'uppercase' },
  dateText: { color: '#555', fontSize: 12 },
  adminFooter: { 
    marginTop: 12, 
    paddingTop: 10, 
    borderTopWidth: 1, 
    borderTopColor: '#222', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  userName: { color: '#888', fontSize: 12, marginLeft: 5 },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50 }
});
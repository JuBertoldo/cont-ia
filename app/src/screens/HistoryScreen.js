import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// IMPORTANTE: Adicionamos 'where' e o 'auth'
import { db, auth } from '../config/firebaseConfig'; 
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from 'firebase/firestore';

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // 1. Pegamos o ID do usuário que está logado agora
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Erro", "Usuário não identificado.");
      return;
    }

    // 2. Ajustamos a Query: adicionamos o filtro 'where' para buscar apenas o que pertence ao userId
    const q = query(
      collection(db, "inventario"), 
      where("userId", "==", user.uid), // <--- FILTRO DE PRIVACIDADE
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaFirebase = snapshot.docs.map(documento => ({
        id_firebase: documento.id,
        ...documento.data()
      }));
      setHistory(listaFirebase);
    }, (error) => {
      console.log(error);
      Alert.alert("Erro", "Não foi possível carregar seus dados específicos.");
    });

    return () => unsubscribe();
  }, []);

  const excluirItem = async (id_firebase) => {
    try {
      await deleteDoc(doc(db, "inventario", id_firebase));
    } catch (error) {
      Alert.alert("Erro", "Não foi possível excluir o item.");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.imageUri }} style={styles.image} />
      </View>
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{item.itemName}</Text>
          <Text style={styles.qty}>Qtd: {item.quantity}</Text>
        </View>
        <Text style={styles.detail}>ID DOC: {item.id_firebase.substring(0,6)}...</Text>
        <Text style={styles.date}>{item.date} às {item.time}</Text>
      </View>
      <TouchableOpacity onPress={() => excluirItem(item.id_firebase)} style={styles.del}>
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>MEU INVENTÁRIO NUVEM</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList 
        data={history} 
        keyExtractor={item => item.id_firebase} 
        renderItem={renderItem} 
        contentContainerStyle={styles.list} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Manti seus estilos exatamente iguais
  container: { flex: 1, backgroundColor: '#050505', paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  list: { paddingHorizontal: 15 },
  card: { backgroundColor: '#121212', borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  imageContainer: { width: 60, height: 60, borderRadius: 8, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  info: { flex: 1, marginLeft: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#fff', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', flex: 1 },
  qty: { color: '#00FF88', fontSize: 15, fontWeight: 'bold' },
  detail: { color: '#666', fontSize: 11, marginTop: 2 },
  date: { color: '#444', fontSize: 10 },
  del: { padding: 5 }
});
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HistoryScreen({ route, navigation }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const carregar = async () => {
      const salvo = await AsyncStorage.getItem('@contia_history');
      if (salvo) setHistory(JSON.parse(salvo));
    };
    carregar();
  }, []);

  useEffect(() => {
    if (route.params?.novosItens) {
      const salvar = async () => {
        const novaLista = [...route.params.novosItens, ...history];
        setHistory(novaLista);
        await AsyncStorage.setItem('@contia_history', JSON.stringify(novaLista));
        navigation.setParams({ novosItens: null });
      };
      salvar();
    }
  }, [route.params?.novosItens]);

  const excluirItem = async (id) => {
    const novaLista = history.filter(item => item.id !== id);
    setHistory(novaLista);
    await AsyncStorage.setItem('@contia_history', JSON.stringify(novaLista));
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
        <Text style={styles.detail}>ID: #{item.id}</Text>
        <Text style={styles.date}>{item.date} às {item.time}</Text>
      </View>
      <TouchableOpacity onPress={() => excluirItem(item.id)} style={styles.del}>
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>INVENTÁRIO</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList data={history} keyExtractor={item => item.id} renderItem={renderItem} contentContainerStyle={styles.list} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  list: { paddingHorizontal: 15 },
  card: { backgroundColor: '#121212', borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  imageContainer: { width: 60, height: 60, borderRadius: 8, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  info: { flex: 1, marginLeft: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#fff', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', flex: 1, marginRight: 5 },
  qty: { color: '#00FF88', fontSize: 15, fontWeight: 'bold' },
  detail: { color: '#666', fontSize: 11, marginTop: 2 },
  date: { color: '#444', fontSize: 10 },
  del: { padding: 5 }
});
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ScannerScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>MÓDULO DE IA (CÂMERA)</Text>
      <Text style={styles.subtext}>A câmera não funciona no navegador, apenas no celular.</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>VOLTAR PARA HOME</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#00FF88', fontSize: 24, fontWeight: 'bold' },
  subtext: { color: '#666', fontSize: 14, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 },
  button: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 10, marginTop: 30, borderWidth: 1, borderColor: '#333' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});
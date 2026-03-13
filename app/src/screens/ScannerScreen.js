import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
// Importamos o CameraView para a imagem real
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // 1. Verificação de Permissão
  if (!permission) {
    return <View style={styles.container}><Text style={styles.text}>Carregando...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>O aplicativo precisa de acesso à câmera.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Conceder Permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 📸 FUNÇÃO DE DISPARO E SALVAMENTO
  const tirarFoto = async () => {
    // Simulando o que a IA faria (sorteando quantidade)
    const qtdSorteada = Math.floor(Math.random() * 50) + 10; 
    
    const novoLote = {
      id: Math.random().toString(), 
      itemName: 'Peça Identificada (IA)',
      quantity: qtdSorteada,
      confidence: '95%',
      date: new Date().toLocaleString('pt-BR'),
      imageUri: 'https://images.unsplash.com/photo-1585202656335-519a48f41348?w=200&h=200&fit=crop'
    };

    try {
      // Salva no AsyncStorage (Memória Local)
      const dadosSalvos = await AsyncStorage.getItem('@contia_historico');
      let historicoAtual = dadosSalvos ? JSON.parse(dadosSalvos) : [];
      historicoAtual.unshift(novoLote);
      await AsyncStorage.setItem('@contia_historico', JSON.stringify(historicoAtual));

      // Tenta o flash da câmera física
      if (cameraRef.current) {
        // takePictureAsync funciona no Mobile e em alguns navegadores modernos
        await cameraRef.current.takePictureAsync().catch(e => console.log("Erro foto:", e));
      }

      alert(`✅ Lote de ${qtdSorteada} peças registrado!`);
      navigation.navigate('Home');

    } catch (error) {
      alert("Erro ao processar imagem.");
    }
  };

  return (
    <View style={styles.container}>
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#00FF88" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SCANNER EM TEMPO REAL</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* ÁREA DA CÂMERA */}
      <View style={styles.cameraContainer}>
        <CameraView 
          style={styles.camera} 
          facing="back" 
          ref={cameraRef}
        >
          {/* OVERLAY DE MIRA */}
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
          </View>
        </CameraView>
      </View>

      {/* RODAPÉ E BOTÃO */}
      <View style={styles.footer}>
        <Text style={styles.instructionText}>Posicione os componentes no centro</Text>
        <TouchableOpacity style={styles.captureButton} onPress={tirarFoto}>
          <View style={styles.captureInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingTop: 50, 
    paddingHorizontal: 20, 
    paddingBottom: 20, 
    backgroundColor: '#050505' 
  },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 260, height: 260, position: 'relative' },
  // Estilos para as "quinas" verdes da mira
  cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderLeftWidth: 3, borderTopWidth: 3, borderColor: '#00FF88' },
  cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderRightWidth: 3, borderTopWidth: 3, borderColor: '#00FF88' },
  cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: '#00FF88' },
  cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderRightWidth: 3, borderBottomWidth: 3, borderColor: '#00FF88' },
  
  footer: { backgroundColor: '#050505', paddingVertical: 40, alignItems: 'center' },
  instructionText: { color: '#666', marginBottom: 20, fontSize: 12, fontWeight: '600' },
  captureButton: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: 'rgba(0, 255, 136, 0.2)', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00FF88'
  },
  captureInner: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#00FF88' 
  },
  text: { color: '#fff', textAlign: 'center' },
  button: { backgroundColor: '#00FF88', padding: 15, borderRadius: 10, alignSelf: 'center', marginTop: 20 },
  buttonText: { color: '#000', fontWeight: 'bold' }
});
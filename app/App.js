import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { Camera } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';

const TensorCamera = cameraWithTensors(Camera);

export default function App() {
  const [isModelReady, setIsModelReady] = useState(false);
  
  // ESTADO DE INVENTÁRIO: Aqui é onde a mágica do acúmulo acontece
  const [inventory, setInventory] = useState({
    'Sextavado': 0,
    'Philips': 0,
    'Allen': 0,
    'Arruela': 0
  });

  useEffect(() => {
    (async () => {
      await Camera.requestCameraPermissionsAsync();
      await tf.ready();
      setIsModelReady(true);
    })();
  }, []);

  // Lógica para renderizar os itens do inventário de forma elegante
  const renderInventoryItem = ({ item }) => (
    <View style={styles.inventoryCard}>
      <View style={styles.cardHeader}>
        <View style={styles.dot} />
        <Text style={styles.inventoryName}>{item.toUpperCase()}</Text>
      </View>
      <Text style={styles.inventoryCount}>{inventory[item]}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Área da Câmera (75% da tela) */}
      <View style={styles.cameraContainer}>
        <TensorCamera
          style={styles.camera}
          type={Camera.Constants.Type.back}
          autorender={true}
          resizeHeight={640}
          resizeWidth={640}
          resizeDepth={3}
        />
        
        {/* HUD de Status sobre a câmera */}
        <View style={styles.hudHeader}>
          <Text style={styles.logoText}>CONT.<Text style={{color: '#00FF88'}}>IA</Text></Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>SCANNER ATIVO</Text>
          </View>
        </View>
      </View>

      {/* PAINEL DE INVENTÁRIO (25% da tela) - O que você sugeriu! */}
      <View style={styles.footer}>
        <View style={styles.footerHeader}>
          <Text style={styles.footerTitle}>RESUMO DO LOTE</Text>
          <TouchableOpacity onPress={() => setInventory({ 'Sextavado': 0, 'Philips': 0, 'Allen': 0, 'Arruela': 0 })}>
            <Text style={styles.resetLink}>LIMPAR</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={Object.keys(inventory)}
          renderItem={renderInventoryItem}
          keyExtractor={item => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.inventoryList}
        />

        <TouchableOpacity style={styles.btnFinish}>
          <Text style={styles.btnFinishText}>GERAR RELATÓRIO DE CONFERÊNCIA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraContainer: { flex: 0.75, overflow: 'hidden', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  camera: { flex: 1 },
  
  hudHeader: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  liveBadge: { backgroundColor: 'rgba(0, 255, 136, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5, borderWidth: 1, borderColor: '#00FF88' },
  liveText: { color: '#00FF88', fontSize: 9, fontWeight: '900' },

  footer: { flex: 0.25, backgroundColor: '#121212', padding: 20 },
  footerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  footerTitle: { color: '#444', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  resetLink: { color: '#666', fontSize: 10, fontWeight: 'bold' },

  inventoryList: { paddingRight: 20 },
  inventoryCard: { backgroundColor: '#1E1E1E', padding: 15, borderRadius: 12, marginRight: 12, minWidth: 110, justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF88', marginRight: 6 },
  inventoryName: { color: '#888', fontSize: 9, fontWeight: 'bold' },
  inventoryCount: { color: '#fff', fontSize: 28, fontWeight: '300' },

  btnFinish: { backgroundColor: '#fff', marginTop: 15, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnFinishText: { color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 }
});
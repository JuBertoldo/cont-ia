import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';

const TensorCamera = cameraWithTensors(Camera);

export default function App() {
  const [inventory, setInventory] = useState({
    'Sextavado': 0, 'Philips': 0, 'Allen': 0, 'Arruela': 0
  });
  
  const isProcessing = useRef(false);

  const handleCameraStream = (images) => {
    const loop = async () => {
      if (isProcessing.current) return;
      
      const nextImageTensor = images.next().value;
      if (nextImageTensor) {
        isProcessing.current = true;
        try {
          // AQUI ENTRARÁ A MÁGICA DO YOLO NA SPRINT 4
        } catch (error) {
          console.log("Erro no processamento:", error);
        } finally {
          tf.dispose([nextImageTensor]); 
          isProcessing.current = false;
        }
      }
      requestAnimationFrame(loop);
    };
    loop();
  };

  const updateInventory = (type) => {
    setInventory(prev => ({
      ...prev,
      [type]: prev[type] + 1
    }));
  };

  // O Return (Interface) entra aqui embaixo...
  return (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff' }}>Estrutura de IA Pronta!</Text>
    </View>
  );
}
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [isTfReady, setIsTfReady] = useState(false);

  useEffect(() => {
    (async () => {
      // 1. Pede permissão da câmera
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      // 2. Espera o TensorFlow inicializar
      await tf.ready();
      setIsTfReady(true);
      console.log("TensorFlow pronto!");
    })();
  }, []);

  // Tela de carregamento enquanto a IA não acorda
  if (hasPermission === null || !isTfReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Iniciando Inteligência Artificial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={'back'}>
        <View style={styles.overlay}>
          <Text style={styles.text}>📸 Cont.IA: IA Ativa</Text>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, width: '100%' },
  overlay: { flex: 1, backgroundColor: 'transparent', alignItems: 'center', marginTop: 60 },
  text: { fontSize: 20, color: 'white', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10 },
});
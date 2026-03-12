import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { Camera } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';

// Criamos uma câmera especial que já entrega "tensores" (números para a IA)
const TensorCamera = cameraWithTensors(Camera);

const { width, height } = Dimensions.get('window');

export default function App() {
  const [isModelReady, setIsModelReady] = useState(false);
  const [detections, setDetections] = useState([]);
  const rafId = useRef(null); // Para controlar o loop de repetição

  useEffect(() => {
    (async () => {
      await Camera.requestCameraPermissionsAsync();
      await tf.ready();
      // Aqui o modelo será carregado de fato na próxima etapa
      setIsModelReady(true);
    })();

    // Limpa a memória quando fechar o app
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // FUNÇÃO MÁGICA: Processa cada frame da câmera
  const handleCameraStream = (images) => {
    const loop = async () => {
      const nextImageTensor = images.next().value;

      if (nextImageTensor) {
        // 1. O modelo analisa o tensor (imagem em números)
        // 2. O resultado (quadrados) vai para o estado 'detections'
        
        // Por enquanto, apenas liberamos a memória do tensor
        tf.dispose([nextImageTensor]);
      }

      rafId.current = requestAnimationFrame(loop);
    };
    loop();
  };

  if (!isModelReady) {
    return <View style={styles.container}><Text>Carregando Inteligência...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <TensorCamera
        style={styles.camera}
        type={Camera.Constants.Type.back}
        onReady={handleCameraStream}
        autorender={true}
        resizeHeight={640} // Tamanho padrão do YOLO
        resizeWidth={640}
        resizeDepth={3}
      />
      {/* Aqui vamos desenhar os quadrados dos parafusos depois */}
      <View style={styles.overlay}>
        <Text style={styles.text}>Aponte para os parafusos</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  overlay: { position: 'absolute', top: 50, width: '100%', alignItems: 'center' },
  text: { color: 'white', fontSize: 18, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10 }
});
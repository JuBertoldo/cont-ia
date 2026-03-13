import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as mobilenet from '@tensorflow-models/mobilenet'; // 👈 Importa o modelo
import { View, Text, ActivityIndicator } from 'react-native';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState('Ligando motores...');

  useEffect(() => {
    async function prepareIA() {
      try {
        setStatus('Inicializando TensorFlow...');
        await tf.ready();
        
        setStatus('Carregando Cérebro da IA...');
        // Carrega o modelo de reconhecimento de objetos
        const model = await mobilenet.load();
        
        // Guardamos o modelo globalmente para usar em qualquer tela
        global.modelIA = model; 
        
        console.log("🧠 Modelo MobileNet carregado com sucesso!");
        setIsReady(true);
      } catch (error) {
        console.log("Erro na carga:", error);
        setStatus('Erro ao carregar IA');
      }
    }
    prepareIA();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00FF88" />
        <Text style={{ color: '#fff', marginTop: 20, fontWeight: 'bold', letterSpacing: 1 }}>{status}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
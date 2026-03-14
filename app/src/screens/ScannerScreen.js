import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { moveAsync, documentDirectory } from 'expo-file-system/legacy'; // Padrão novo do Expo

const GOOGLE_API_KEY = 'AIzaSyC3AF72DaXWY2jSk1LGtMS9CVIwE2mlKVk';

export default function ScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef(null);

  const traduzir = async (texto) => {
    try {
      const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        body: JSON.stringify({ q: texto, target: 'pt' }),
      });
      const data = await res.json();
      return data.data.translations[0].translatedText;
    } catch { return texto; }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || scanning) return;
    setScanning(true);

    try {
      // 1. Tira a foto com alta qualidade para a IA enxergar melhor
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: true });
      
      // 2. Salva a foto permanentemente no armazenamento do celular
      const nomeArquivo = `foto_${Date.now()}.jpg`;
      const caminhoPermanente = `${documentDirectory}${nomeArquivo}`;
      await moveAsync({ from: photo.uri, to: caminhoPermanente });

      // 3. Envia para o Google Vision (Objetos + Etiquetas detalhadas)
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: photo.base64 },
            features: [
              { type: "OBJECT_LOCALIZATION", maxResults: 50 },
              { type: "LABEL_DETECTION", maxResults: 20 }
            ]
          }]
        })
      });

      const result = await response.json();
      const objetos = result.responses[0]?.localizedObjectAnnotations || [];
      const labels = result.responses[0]?.labelAnnotations || [];

      if (objetos.length === 0) {
        Alert.alert("Atenção", "Nenhum objeto identificado. Tente outro ângulo.");
        setScanning(false);
        return;
      }

      // 4. Lógica de Agrupamento e Precisão de Nomes
      const contagemAgrupada = {};
      objetos.forEach(obj => {
        if (obj.score > 0.35) { // Limite de confiança mais baixo para detectar tudo
          let nomeItem = obj.name;
          
          // Se o nome for genérico (Utensílio), busca algo mais específico nas Labels
          if (nomeItem === "Tableware" || nomeItem === "Kitchenware" || nomeItem === "Object") {
            const detalhe = labels.find(l => 
              l.description.toLowerCase().includes("cup") || 
              l.description.toLowerCase().includes("glass") ||
              l.description.toLowerCase().includes("bottle")
            );
            if (detalhe) nomeItem = detalhe.description;
          }
          
          contagemAgrupada[nomeItem] = (contagemAgrupada[nomeItem] || 0) + 1;
        }
      });

      // 5. Traduz e gera as linhas para o histórico
      const promessas = Object.entries(contagemAgrupada).map(async ([nomeIngles, qtd]) => {
        const nomeTraduzido = await traduzir(nomeIngles);
        return {
          id: Math.floor(100000 + Math.random() * 900000).toString(),
          itemName: nomeTraduzido,
          quantity: qtd,
          date: new Date().toLocaleDateString('pt-BR'),
          time: new Date().toLocaleTimeString('pt-BR'),
          imageUri: caminhoPermanente
        };
      });

      const novosItens = await Promise.all(promessas);
      setScanning(false);
      navigation.navigate('History', { novosItens });

    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Falha na detecção. Verifique sua internet.");
      setScanning(false);
    }
  };

  if (!permission?.granted) return <View style={styles.container}><TouchableOpacity onPress={requestPermission} style={styles.btn}><Text>Ativar Câmera</Text></TouchableOpacity></View>;

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={30} color="#fff" /></TouchableOpacity>
          <View style={styles.target}>
             <View style={[styles.corner, {top:0, left:0, borderRightWidth:0, borderBottomWidth:0}]} />
             <View style={[styles.corner, {top:0, right:0, borderLeftWidth:0, borderBottomWidth:0}]} />
             <View style={[styles.corner, {bottom:0, left:0, borderRightWidth:0, borderTopWidth:0}]} />
             <View style={[styles.corner, {bottom:0, right:0, borderLeftWidth:0, borderTopWidth:0}]} />
          </View>
          <TouchableOpacity style={styles.capture} onPress={handleCapture} disabled={scanning}>
            {scanning ? <ActivityIndicator color="#000" size="large" /> : <View style={styles.inner} />}
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  back: { position: 'absolute', top: 50, left: 25 },
  target: { width: 260, height: 260 },
  corner: { width: 40, height: 40, borderColor: '#00FF88', borderWidth: 5, position: 'absolute' },
  capture: { position: 'absolute', bottom: 60, width: 80, height: 80, borderRadius: 40, backgroundColor: '#00FF88', justifyContent: 'center', alignItems: 'center' },
  inner: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#000' },
  btn: { backgroundColor: '#00FF88', padding: 20, borderRadius: 10, alignSelf: 'center', marginTop: '50%' }
});
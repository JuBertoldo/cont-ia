import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const GOOGLE_CLOUD_VISION_API_KEY = "AIzaSyCEPbm9ksYvZ24XhupJQ6m8r-w5dPrUvjI";

const TRADUTOR = {
  "Chair": "Cadeira",
  "Bottle": "Garrafa",
  "Mobile phone": "Smartphone",
  "Remote control": "Splitter / Controle",
  "Monitor": "Monitor / TV",
  "Desk": "Mesa",
  "Laptop": "Notebook"
};

const IGNORAR = ["Room", "Wall", "Floor", "White", "Person", "Hand", "Finger"];

export default function ScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('PRONTO PARA SCANNER'); 
  const cameraRef = useRef(null);

  if (!permission || !permission.granted) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.btnText}>Ativar Câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const analisarComGoogle = async () => {
    if (!cameraRef.current || isProcessing) return;
    setIsProcessing(true);
    setStatusMsg('📸 TIRANDO FOTO...');

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      const base64Limpo = photo.base64.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");

      setStatusMsg('☁️ ENVIANDO AO GOOGLE...');

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Limpo },
              features: [{ type: "OBJECT_LOCALIZATION", maxResults: 10 }]
            }]
          })
        }
      );

      const data = await response.json();
      const objetos = data.responses[0]?.localizedObjectAnnotations || [];
      const contagem = {};

      // 🛡️ FILTRO DE UNICIDADE
      objetos.forEach(obj => {
        let nomeOriginal = obj.name;
        
        // Ignora nomes genéricos longos (Ex: "Bottled and jarred...")
        if (nomeOriginal.length > 25) return; 

        if (!IGNORAR.includes(nomeOriginal)) {
          const nomeFinal = TRADUTOR[nomeOriginal] || nomeOriginal;
          
          // Se não estiver na lista, adiciona. Se já estiver, ignora o duplicado.
          if (!contagem[nomeFinal]) {
             contagem[nomeFinal] = 1;
          }
        }
      });

      const chavesEncontradas = Object.keys(contagem);

      if (chavesEncontradas.length > 0) {
        setStatusMsg('✅ SALVANDO...');
        
        // Criando os registros que faltavam no seu código anterior
        const registros = chavesEncontradas.map(nome => ({
          id: `ID-${Date.now()}-${nome}`,
          itemName: nome,
          quantity: contagem[nome],
          date: new Date().toLocaleTimeString('pt-BR'),
          imageUri: null,
          confidence: "Google Vision"
        }));

        const stored = await AsyncStorage.getItem('@contia_historico');
        const history = stored ? JSON.parse(stored) : [];
        await AsyncStorage.setItem('@contia_historico', JSON.stringify([...registros, ...history]));

        navigation.navigate('Home');
      } else {
        setStatusMsg('⚠️ NADA ENCONTRADO');
        setIsProcessing(false);
      }
    } catch (err) {
      console.log(err);
      setStatusMsg('❌ ERRO NO SCANNER');
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} />
      <View style={styles.uiLayer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.badge}><Text style={styles.badgeText}>{statusMsg}</Text></View>
        </View>

        <TouchableOpacity style={styles.captureBtn} onPress={analisarComGoogle} disabled={isProcessing}>
          {isProcessing ? <ActivityIndicator color="#000" /> : <Ionicons name="scan-outline" size={32} color="#000" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  uiLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 30 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  backBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  badge: { backgroundColor: '#00FF88', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginLeft: 15 },
  badgeText: { fontWeight: 'bold', fontSize: 12 },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#00FF88', alignSelf: 'center', marginBottom: 30, justifyContent: 'center', alignItems: 'center' },
  permissionBtn: { backgroundColor: '#00FF88', padding: 20, borderRadius: 10, alignSelf: 'center', marginTop: 100 },
  btnText: { fontWeight: 'bold' }
});
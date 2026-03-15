import React, { useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ActivityIndicator, Text } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native'; // Adicionado useIsFocused

// Firebase
import { db, auth } from '../config/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const GOOGLE_API_KEY = 'AIzaSyCtFGbBI61y6hYS3C8Lnp1mA2VqUJ0xbY8';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const isFocused = useIsFocused(); // Detecta se a tela está ativa
  const cameraRef = useRef(null);
  const navigation = useNavigation();

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={{color: 'black', fontWeight: 'bold'}}>Ativar Câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const traduzir = async (texto) => {
    try {
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        body: JSON.stringify({ q: texto, target: 'pt' }),
      });
      const data = await response.json();
      return data.data.translations[0].translatedText;
    } catch { return texto; }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || scanning) return;
    setScanning(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: photo.base64 },
            features: [
              { type: "LABEL_DETECTION", maxResults: 10 },
              { type: "OBJECT_LOCALIZATION", maxResults: 5 }
            ]
          }]
        })
      });

      const result = await response.json();
      const labels = result.responses[0]?.labelAnnotations || [];
      const objetos = result.responses[0]?.localizedObjectAnnotations || [];

      const banidos = ['Tableware', 'Utensil', 'Product', 'Object', 'Dishware'];
      let escolha = "";

      const labelOk = labels.find(l => !banidos.some(p => l.description.includes(p)));
      
      if (labelOk) {
        escolha = labelOk.description;
      } else if (objetos.length > 0) {
        escolha = objetos[0].name;
      } else {
        escolha = "Item";
      }

      const nomeFinal = await traduzir(escolha);
      const agora = new Date();

      // SALVAMENTO COM USERID E TIME
      await addDoc(collection(db, "inventario"), {
        itemName: nomeFinal.toUpperCase(),
        quantity: 1, 
        date: agora.toLocaleDateString('pt-BR'),
        time: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp(),
        imageUri: photo.uri,
        userId: auth.currentUser.uid // O "Carimbo" do usuário
      });

      Alert.alert("Sucesso", `${nomeFinal} registrado!`);
      navigation.navigate('History');

    } catch (error) {
      Alert.alert("Erro", "Falha ao processar imagem.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* A CÂMERA SÓ LIGA SE A TELA ESTIVER FOCADA */}
      {isFocused && (
        <CameraView style={styles.camera} ref={cameraRef}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={30} color="white" />
          </TouchableOpacity>
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleCapture} disabled={scanning}>
              {scanning ? <ActivityIndicator size="large" color="#00FF88" /> : <Ionicons name="scan-circle" size={100} color="#00FF88" />}
            </TouchableOpacity>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  back: { position: 'absolute', top: 50, left: 20 },
  footer: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
  btn: { backgroundColor: '#00FF88', padding: 20, borderRadius: 10, alignSelf: 'center', marginTop: 100 }
});
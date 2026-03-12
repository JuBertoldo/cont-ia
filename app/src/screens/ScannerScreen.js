import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Camera } from 'expo-camera';

export default function ScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null); // Referência para o fluxo de vídeo

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      if (Platform.OS === 'web' && status === 'granted') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream; // Guarda o stream para desligar depois
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Erro na webcam:", err);
        }
      }
    })();

    // Função de limpeza: Executa quando o usuário sai da tela
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        console.log("Câmera desligada com sucesso.");
      }
    };
  }, []);

  const tirarFoto = () => {
    console.log("Capturando frame para análise...");
    // Aqui no futuro conectaremos a IA para analisar o frame atual do videoRef
    alert("Foto capturada! Analisando parafuso...");
  };

  if (hasPermission === null) return <View style={styles.container}><Text style={styles.text}>Carregando...</Text></View>;

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={styles.cameraContainer}>
          <video ref={videoRef} autoPlay playsInline muted style={styles.webVideo} />
          
          {/* INTERFACE SOBREPOSTA (HUD) */}
          <View style={styles.overlay}>
             <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backButtonText}>✕</Text>
             </TouchableOpacity>
             
             <View style={styles.scanTarget} />
          </View>
        </View>
      ) : (
        <Camera style={styles.camera} type={Camera.Constants.Type.back} />
      )}

      {/* CONTROLES INFERIORES */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.captureBtn} onPress={tirarFoto}>
          <View style={styles.captureBtnInner} />
        </TouchableOpacity>
        <Text style={styles.hintText}>POSICIONE O ITEM NO CENTRO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraContainer: { flex: 1 },
  webVideo: { width: '100%', height: '100%', objectFit: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  
  // Botão de Voltar (X)
  backButton: { position: 'absolute', top: 50, left: 30, backgroundColor: 'rgba(0,0,0,0.5)', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  // Mira do Scanner
  scanTarget: { width: 250, height: 250, borderWidth: 2, borderColor: '#00FF88', borderRadius: 20, backgroundColor: 'rgba(0,255,136,0.05)' },

  // Barra de Controles
  controls: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  hintText: { color: '#00FF88', fontSize: 10, fontWeight: 'bold', marginTop: 15, letterSpacing: 1 }
});
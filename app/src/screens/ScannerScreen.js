import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { CameraView, Camera } from 'expo-camera';

export default function ScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          setHasPermission(true); // Diz que temos permissão para desenhar o ecrã
        } catch (err) {
          setHasPermission(false);
        }
      } else {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      }
    })();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // A MÁGICA ACONTECE AQUI: Assim que tiver permissão e a tag de vídeo existir, ligamos o vídeo!
  useEffect(() => {
    if (Platform.OS === 'web' && hasPermission === true && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [hasPermission]);

 const tirarFoto = async () => {
    if (Platform.OS === 'web') {
      alert("Flash! 📸 (Foto simulada na Web)");
    } else {
      // Tira foto de verdade no celular
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync();
        // Tiramos o caminho feio e deixamos só a confirmação!
        alert("Foto capturada com sucesso! 📸"); 
      }
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.hintText}>A solicitar permissão da câmara...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.hintText}>Acesso à câmara negado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={styles.cameraContainer}>
          <video ref={videoRef} autoPlay playsInline muted style={styles.webVideo} />
          
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>X</Text>
            </TouchableOpacity>
            <View style={styles.scanTarget} />
          </View>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView 
            style={styles.camera} 
            facing="back" 
            ref={cameraRef}
          >
            <View style={styles.overlay}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backButtonText}>X</Text>
              </TouchableOpacity>
              <View style={styles.scanTarget} />
            </View>
          </CameraView>
        </View>
      )}

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
  camera: { flex: 1 },
  webVideo: { width: '100%', height: '100%', objectFit: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  backButton: { position: 'absolute', top: 50, left: 30, backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  scanTarget: { width: 250, height: 250, borderWidth: 2, borderColor: '#0f0', borderRadius: 20 },
  controls: { padding: 30, alignItems: 'center', backgroundColor: '#000', paddingBottom: 50 },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  captureBtnInner: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#000' },
  hintText: { color: '#fff', fontSize: 14, fontWeight: '500' }
});
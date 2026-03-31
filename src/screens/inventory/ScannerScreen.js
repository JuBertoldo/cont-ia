import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';

import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { MESSAGES } from '../../constants/messages';

import { auth } from '../../config/firebaseConfig';
import { analyzeImageWithScannerPipeline } from '../../services/scannerService';
import { uploadImage } from '../../services/storageService';
import { createInventoryItem } from '../../services/inventoryService';
import { mapAiErrorMessage } from '../../utils/mapAiErrorMessage';

export default function ScannerScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isFocused = useIsFocused();

  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.textCenter}>
          Precisamos de permissão para usar a câmera.
        </Text>

        <TouchableOpacity style={styles.btnPermissao} onPress={requestPermission}>
          <Text style={styles.btnText}>CONCEDER PERMISSÃO</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const generateScanId = () => `scan_${auth.currentUser.uid}_${Date.now()}`;

  const processarAuditoriaIA = async (photoData) => {
    setLoading(true);

    try {
      if (!auth.currentUser) throw new Error('Usuário não autenticado.');
      if (!photoData?.base64 || !photoData?.uri) throw new Error('Imagem inválida.');

      const scanId = generateScanId();
      const aiResult = await analyzeImageWithScannerPipeline(photoData.base64);

      const fileName = `${scanId}.jpg`;
      const photoUrl = await uploadImage({
        uri: photoData.uri,
        path: `inventario/${auth.currentUser.uid}/${fileName}`,
      });

      await createInventoryItem({
        scanId,
        item: aiResult.item || 'não identificado',
        classificacao: aiResult.classificacao || 'indefinido',
        quantidade: aiResult.quantidade ?? 0,
        repetidos: aiResult.repetidos ?? 0,
        descricao: aiResult.descricao || '',
        fotoUrl: photoUrl,
        fotoNome: fileName,
        usuarioId: auth.currentUser.uid,
        usuarioNome: auth.currentUser.displayName || 'Operador',
        usuarioRole: 'user',
        local: aiResult.local || '',
        origem: 'scanner',
      });

      Alert.alert('Sucesso!', 'Patrimônio identificado e auditado.');
      navigation.navigate(ROUTES.HISTORY);
    } catch (error) {
      console.error('Erro ao processar auditoria:', error);
      const friendlyMessage = mapAiErrorMessage(error);
      Alert.alert('Erro', friendlyMessage || MESSAGES.GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const tirarFoto = async () => {
    if (!cameraRef.current || loading) return;

    try {
      const data = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });

      await processarAuditoriaIA(data);
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível capturar a imagem.');
    }
  };

  return (
    <View style={styles.container}>
      {isFocused ? (
        <CameraView style={StyleSheet.absoluteFillObject} ref={cameraRef} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: COLORS.BLACK }]} />
      )}

      <View style={styles.overlay}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close-circle-outline" size={isTablet ? 44 : 40} color={COLORS.WHITE} />
        </TouchableOpacity>

        <View style={[styles.scanWindow, isTablet && styles.scanWindowTablet]} />

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>IA ANALISANDO...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.captureBtn} onPress={tirarFoto}>
            <View style={styles.innerCircle} />
          </TouchableOpacity>
        )}

        <Text style={styles.hintText}>
          Aponte para o objeto e capture a imagem
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BLACK },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  scanWindow: {
    width: 280,
    height: 280,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    borderRadius: 20,
    borderStyle: 'dashed',
  },
  scanWindowTablet: { width: 360, height: 360 },
  captureBtn: {
    width: 85,
    height: 85,
    borderRadius: 45,
    borderWidth: 5,
    borderColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: { width: 65, height: 65, borderRadius: 35, backgroundColor: COLORS.WHITE },
  loadingBox: { alignItems: 'center' },
  loadingText: { color: COLORS.PRIMARY, fontWeight: 'bold', marginTop: 10, letterSpacing: 2 },
  backBtn: { alignSelf: 'flex-start', marginLeft: 30 },
  hintText: { color: COLORS.WHITE, fontSize: 14, opacity: 0.7, textAlign: 'center', paddingHorizontal: 20 },
  textCenter: { color: COLORS.WHITE, textAlign: 'center', padding: 20 },
  btnPermissao: {
    backgroundColor: COLORS.PRIMARY,
    padding: 15,
    borderRadius: 10,
    alignSelf: 'center',
  },
  btnText: { fontWeight: 'bold', color: COLORS.BLACK },
});
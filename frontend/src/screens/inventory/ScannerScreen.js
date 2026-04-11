import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import {
  detectWithYolo,
  summarizeDetections,
} from '../../services/yoloService';
import { createInventoryItem } from '../../services/inventoryService';
import { imageUriToBase64 } from '../../services/scannerService';
import { auth } from '../../config/firebaseConfig';
import { getUserProfile } from '../../services/authService';

const PICKER_ERROR_MESSAGES = {
  camera_unavailable: 'Câmera não disponível neste dispositivo.',
  permission:
    'Permissão negada. Acesse Configurações e libere o acesso à câmera/galeria.',
  others: 'Erro ao abrir o seletor de imagem.',
};

function extractUriFromPickerResult(result) {
  if (!result || result.didCancel) return null;
  if (result.errorCode) {
    const msg =
      PICKER_ERROR_MESSAGES[result.errorCode] ||
      result.errorMessage ||
      'Erro no seletor de imagem.';
    throw new Error(msg);
  }
  return result.assets?.[0]?.uri || null;
}

function getLocation() {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      pos => resolve(pos.coords),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

export default function ScannerScreen() {
  const navigation = useNavigation?.();
  const currentUser = useMemo(() => auth.currentUser, []);

  const [imageUri, setImageUri] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState(null);
  const [localText, setLocalText] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);
  const [usuarioRole, setUsuarioRole] = useState('user');

  // Estado do modal de resultado
  const [modalVisible, setModalVisible] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null); // { summary, detections, yoloMeta }

  useEffect(() => {
    fetchLocation();
    const loadProfile = async () => {
      if (!auth.currentUser) return;
      const profile = await getUserProfile(auth.currentUser.uid);
      setEmpresaId(profile?.empresaId || null);
      setUsuarioRole(profile?.role || 'user');
    };
    loadProfile();
  }, []);

  const fetchLocation = async () => {
    setGpsLoading(true);
    const coords = await getLocation();
    setLocation(coords);
    setGpsLoading(false);
  };

  const openGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.9,
        selectionLimit: 1,
      });
      const uri = extractUriFromPickerResult(result);
      if (uri) setImageUri(uri);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao abrir galeria.');
    }
  };

  const openCamera = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.9,
        saveToPhotos: false,
      });
      const uri = extractUriFromPickerResult(result);
      if (uri) setImageUri(uri);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao abrir câmera.');
    }
  };

  // Passo 1: só detecta, mostra modal
  const handleDetect = async () => {
    if (!imageUri) {
      Alert.alert('Atenção', 'Selecione ou tire uma foto antes de analisar.');
      return;
    }
    if (!currentUser) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    setDetecting(true);
    try {
      const base64 = await imageUriToBase64(imageUri);
      const yoloResult = await detectWithYolo(base64);
      const detections = Array.isArray(yoloResult?.detections)
        ? yoloResult.detections
        : [];
      const summary = summarizeDetections(detections);

      setDetectionResult({
        summary,
        detections,
        yoloMeta: yoloResult?.meta,
        base64,
      });
      setModalVisible(true);
    } catch (error) {
      Alert.alert(
        'Erro',
        error?.message || 'Erro inesperado ao processar imagem.',
      );
    } finally {
      setDetecting(false);
    }
  };

  // Passo 2: usuário confirma → salva no Firestore
  const handleConfirmSave = async () => {
    if (!detectionResult) return;
    setSaving(true);
    try {
      const { summary, detections, yoloMeta } = detectionResult;

      await createInventoryItem({
        scanId: `scan_${currentUser.uid}_${Date.now()}`,
        origem: 'scanner',
        itens: summary.itens,
        totalGeral: summary.totalGeral,
        item: summary.item,
        classificacao: summary.classificacao,
        quantidade: summary.quantidade,
        descricao: summary.descricao,
        labels: summary.labels,
        detections,
        yoloMeta: yoloMeta || {},
        usuarioId: currentUser.uid,
        usuarioNome: currentUser.displayName || currentUser.email || 'Usuário',
        usuarioRole,
        local: localText.trim(),
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        empresaId,
        fotoUrl: '',
      });

      setModalVisible(false);
      setImageUri('');
      setLocalText('');
      setDetectionResult(null);
      navigation?.navigate(ROUTES.HISTORY, {
        filter: 'all',
        title: 'Histórico de Contagens',
      });
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao salvar contagem.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelModal = () => {
    setModalVisible(false);
    setDetectionResult(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Contar Itens</Text>
        <View style={{ width: 26 }} />
      </View>
      <Text style={styles.subtitle}>
        Fotografe os itens — o app identifica, classifica e conta sem repetição.
      </Text>

      {/* Preview da imagem */}
      <View style={styles.previewBox}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.emptyPreview}>
            <Ionicons name="image-outline" size={42} color={COLORS.GRAY} />
            <Text style={styles.emptyText}>Nenhuma imagem selecionada</Text>
          </View>
        )}
      </View>

      {/* GPS */}
      <View style={styles.gpsRow}>
        <Ionicons name="location-outline" size={16} color={COLORS.PRIMARY} />
        {gpsLoading ? (
          <Text style={styles.gpsText}>Obtendo localização...</Text>
        ) : location ? (
          <Text style={styles.gpsText}>
            GPS: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </Text>
        ) : (
          <TouchableOpacity onPress={fetchLocation}>
            <Text style={[styles.gpsText, { color: COLORS.GRAY }]}>
              GPS indisponível — toque para tentar novamente
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Local descritivo */}
      <TextInput
        style={styles.localInput}
        placeholder="Local (ex: Almoxarifado A, Prateleira 3)"
        placeholderTextColor={COLORS.GRAY}
        value={localText}
        onChangeText={setLocalText}
        maxLength={80}
      />

      {/* Câmera / Galeria */}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={openCamera}
          disabled={detecting}
        >
          <Ionicons name="camera-outline" size={18} color={COLORS.WHITE} />
          <Text style={styles.btnSecondaryText}>Câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={openGallery}
          disabled={detecting}
        >
          <Ionicons name="images-outline" size={18} color={COLORS.WHITE} />
          <Text style={styles.btnSecondaryText}>Galeria</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.btnPrimary}
        onPress={handleDetect}
        disabled={detecting}
      >
        {detecting ? (
          <ActivityIndicator color={COLORS.BLACK} />
        ) : (
          <>
            <Ionicons name="scan-outline" size={18} color={COLORS.BLACK} />
            <Text style={styles.btnPrimaryText}>Identificar e Contar</Text>
          </>
        )}
      </TouchableOpacity>

      {/* ── Modal de resultado ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCancelModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resultado da Contagem</Text>
              <TouchableOpacity onPress={handleCancelModal}>
                <Ionicons name="close" size={24} color={COLORS.GRAY} />
              </TouchableOpacity>
            </View>

            {detectionResult?.summary?.itens?.length > 0 ? (
              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {detectionResult.summary.itens.map((item, idx) => (
                  <View key={idx} style={styles.resultRow}>
                    <View style={styles.resultBadge}>
                      <Text style={styles.resultQtd}>{item.quantidade}x</Text>
                    </View>
                    <Text style={styles.resultLabel}>{item.label}</Text>
                    <Text style={styles.resultConf}>
                      {Math.round((item.confiancaMedia ?? 0) * 100)}%
                    </Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total detectado</Text>
                  <Text style={styles.totalValue}>
                    {detectionResult.summary.totalGeral} iten
                    {detectionResult.summary.totalGeral !== 1 ? 's' : ''}
                  </Text>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.noResultBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={COLORS.GRAY}
                />
                <Text style={styles.noResultText}>
                  Nenhum item reconhecido.{'\n'}Tente uma foto com melhor
                  iluminação.
                </Text>
              </View>
            )}

            <Text style={styles.modalHint}>
              Confirme para salvar ou cancele para refazer a foto.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={handleCancelModal}
                disabled={saving}
              >
                <Text style={styles.btnCancelText}>Refazer foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnConfirm, saving && { opacity: 0.7 }]}
                onPress={handleConfirmSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.BLACK} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-outline"
                      size={18}
                      color={COLORS.BLACK}
                    />
                    <Text style={styles.btnConfirmText}>
                      Confirmar e Salvar
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: { padding: 4 },
  title: { color: COLORS.WHITE, fontSize: 22, fontWeight: 'bold' },
  subtitle: {
    color: COLORS.GRAY,
    marginTop: 6,
    marginBottom: 16,
    fontSize: 13,
  },
  previewBox: {
    height: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: COLORS.DARK,
    overflow: 'hidden',
    marginBottom: 12,
  },
  previewImage: { width: '100%', height: '100%' },
  emptyPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: { color: COLORS.GRAY },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  gpsText: { color: COLORS.PRIMARY, fontSize: 12 },
  localInput: {
    backgroundColor: COLORS.DARK,
    borderRadius: 10,
    padding: 12,
    color: COLORS.WHITE,
    marginBottom: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnSecondaryText: { color: COLORS.WHITE, fontWeight: '600' },
  btnPrimary: {
    marginTop: 4,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimaryText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 16 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { color: COLORS.WHITE, fontSize: 18, fontWeight: 'bold' },
  modalBody: { maxHeight: 220 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  resultBadge: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 44,
    alignItems: 'center',
  },
  resultQtd: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 15 },
  resultLabel: { flex: 1, color: COLORS.WHITE, fontSize: 15 },
  resultConf: { color: COLORS.GRAY, fontSize: 13 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  totalLabel: { color: COLORS.GRAY, fontWeight: 'bold' },
  totalValue: { color: COLORS.PRIMARY, fontWeight: 'bold', fontSize: 16 },
  noResultBox: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  noResultText: { color: COLORS.GRAY, textAlign: 'center', lineHeight: 22 },
  modalHint: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 14,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  btnCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnCancelText: { color: COLORS.WHITE, fontWeight: '600' },
  btnConfirm: {
    flex: 2,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnConfirmText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 15 },
});

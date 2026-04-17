import React, { useEffect, useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
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
import { translateLabel } from '../../utils/labelTranslation';
import { createInventoryItem } from '../../services/inventoryService';
import { imageUriToBase64 } from '../../services/scannerService';
import { auth, storage } from '../../config/firebaseConfig';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { getUserProfile } from '../../services/authService';
import { reverseGeocode } from '../../utils/geocoding';

const CROP_SIZE = 58;

function BBoxCrop({ base64, bbox, imgWidth, imgHeight }) {
  if (!base64 || !bbox || bbox.length < 4 || !imgWidth || !imgHeight) {
    return <View style={cropStyles.placeholder} />;
  }
  const [x1, y1, x2, y2] = bbox;
  const bboxW = Math.max(x2 - x1, 1);
  const bboxH = Math.max(y2 - y1, 1);
  const scale = CROP_SIZE / Math.max(bboxW, bboxH);
  const displayW = imgWidth * scale;
  const displayH = imgHeight * scale;

  return (
    <View style={cropStyles.container}>
      <Image
        source={{ uri: `data:image/jpeg;base64,${base64}` }}
        style={{
          width: displayW,
          height: displayH,
          position: 'absolute',
          left: -(x1 * scale),
          top: -(y1 * scale),
        }}
        resizeMode="cover"
      />
    </View>
  );
}

const cropStyles = StyleSheet.create({
  container: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  placeholder: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
});

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
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  const [imageUri, setImageUri] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [localText, setLocalText] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);
  const [usuarioRole, setUsuarioRole] = useState('user');

  // Estado do modal de resultado
  const [modalVisible, setModalVisible] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  // Correções de label: { [labelOriginal]: 'nome corrigido' }
  const [labelOverrides, setLabelOverrides] = useState({});
  const [editingLabel, setEditingLabel] = useState(null); // label original sendo editado
  const [editText, setEditText] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

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
    setLocationName('');
    const coords = await getLocation();
    setLocation(coords);
    if (coords) {
      const name = await reverseGeocode(coords.latitude, coords.longitude);
      setLocationName(name || '');
    }
    setGpsLoading(false);
  };

  const openGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.5,
        selectionLimit: 1,
      });
      const uri = extractUriFromPickerResult(result);
      if (uri) {
        setImageUri(uri);
        setImageSize({
          width: result.assets[0].width ?? 0,
          height: result.assets[0].height ?? 0,
        });
      }
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao abrir galeria.');
    }
  };

  const openCamera = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.5,
        saveToPhotos: false,
      });
      const uri = extractUriFromPickerResult(result);
      if (uri) {
        setImageUri(uri);
        setImageSize({
          width: result.assets[0].width ?? 0,
          height: result.assets[0].height ?? 0,
        });
      }
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
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
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

  const uploadPhoto = async (base64, uid) => {
    try {
      const path = `scans/${uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadString(storageRef, base64, 'base64', {
        contentType: 'image/jpeg',
      });
      return await getDownloadURL(storageRef);
    } catch (_err) {
      return '';
    }
  };

  // Passo 2: usuário confirma → aplica correções, faz upload e salva no Firestore
  const handleConfirmSave = async () => {
    if (!detectionResult) return;
    setSaving(true);
    try {
      const result = applyOverrides();
      const { summary, detections, yoloMeta, base64, correcoes } = result;
      const fotoUrl = base64 ? await uploadPhoto(base64, currentUser.uid) : '';

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
        // Correções para dataset de treinamento futuro
        correcoes: correcoes ?? [],
        temCorrecoes: (correcoes ?? []).length > 0,
        usuarioId: currentUser.uid,
        usuarioNome: currentUser.displayName || currentUser.email || 'Usuário',
        usuarioEmail: currentUser.email || '',
        usuarioRole,
        local: localText.trim(),
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        empresaId,
        fotoUrl,
      });

      setModalVisible(false);
      setImageUri('');
      setLocalText('');
      setDetectionResult(null);
      setLabelOverrides({});
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
    setLabelOverrides({});
    setEditingLabel(null);
  };

  const startEditLabel = (originalLabel, currentDisplay) => {
    setEditingLabel(originalLabel);
    setEditText(labelOverrides[originalLabel] ?? currentDisplay);
  };

  const confirmEditLabel = () => {
    const trimmed = editText.trim();
    if (trimmed && editingLabel) {
      setLabelOverrides(prev => ({ ...prev, [editingLabel]: trimmed }));
    }
    setEditingLabel(null);
  };

  const cancelEditLabel = () => {
    setEditingLabel(null);
  };

  // Aplica as correções do usuário antes de salvar
  const applyOverrides = () => {
    if (!detectionResult) return detectionResult;
    if (Object.keys(labelOverrides).length === 0) return detectionResult;

    const fixDet = d => ({
      ...d,
      labelOriginal: d.labelOriginal ?? d.label,
      label: labelOverrides[d.label] ?? d.label,
    });

    const fixItem = it => ({
      ...it,
      labelOriginal: it.labelOriginal ?? it.label,
      label: labelOverrides[it.label] ?? it.label,
    });

    const correcoes = Object.entries(labelOverrides).map(
      ([labelOriginal, labelCorrigido]) => {
        const det = detectionResult.detections.find(
          d => d.label === labelOriginal,
        );
        return {
          labelOriginal,
          labelCorrigido,
          confianca: det?.confidence ?? null,
          bbox: det?.bbox ?? null,
        };
      },
    );

    return {
      ...detectionResult,
      detections: detectionResult.detections.map(fixDet),
      summary: {
        ...detectionResult.summary,
        itens: detectionResult.summary.itens.map(fixItem),
        item:
          labelOverrides[detectionResult.summary.item] ??
          detectionResult.summary.item,
        labels: detectionResult.summary.labels.map(l => labelOverrides[l] ?? l),
        descricao: detectionResult.summary.itens
          .map(
            it => `${labelOverrides[it.label] ?? it.label}: ${it.quantidade}`,
          )
          .join(' | '),
      },
      correcoes,
    };
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
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.emptyPreview}>
            <Ionicons name="image-outline" size={56} color={COLORS.GRAY} />
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
          <Text style={styles.gpsText} numberOfLines={2}>
            {locationName ||
              `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(
                5,
              )}`}
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

      {/* ── Modal de resultado — tela cheia ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCancelModal}
      >
        <View style={styles.modalFull}>
          {/* Imagem em destaque */}
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.modalImagePlaceholder} />
          )}

          {/* Overlay com fechar */}
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={handleCancelModal}
          >
            <Ionicons name="close" size={22} color={COLORS.WHITE} />
          </TouchableOpacity>

          {/* Painel inferior com resultados — sobe quando teclado abre */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalPanel}>
              <View style={styles.modalPanelHandle} />
              <Text style={styles.modalTitle}>Resultado da Contagem</Text>

              {detectionResult?.summary?.itens?.length > 0 ? (
                <ScrollView
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                >
                  {detectionResult.summary.itens.map((item, idx) => {
                    const firstDet = detectionResult.detections.find(
                      d => d.label === item.label,
                    );
                    const corrected = labelOverrides[item.label];
                    const displayName = corrected ?? translateLabel(item.label);
                    const isEditing = editingLabel === item.label;

                    return (
                      <View key={idx} style={styles.resultRow}>
                        <BBoxCrop
                          base64={detectionResult.base64}
                          bbox={firstDet?.bbox}
                          imgWidth={detectionResult.imageWidth}
                          imgHeight={detectionResult.imageHeight}
                        />
                        <View style={styles.resultMid}>
                          {isEditing ? (
                            <View style={styles.editRow}>
                              <TextInput
                                style={styles.editInput}
                                value={editText}
                                onChangeText={setEditText}
                                autoFocus
                                placeholder="Nome correto..."
                                placeholderTextColor="#555"
                                onSubmitEditing={confirmEditLabel}
                              />
                              <TouchableOpacity
                                onPress={confirmEditLabel}
                                style={styles.editBtn}
                              >
                                <Ionicons
                                  name="checkmark"
                                  size={18}
                                  color={COLORS.PRIMARY}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={cancelEditLabel}
                                style={styles.editBtn}
                              >
                                <Ionicons
                                  name="close"
                                  size={18}
                                  color={COLORS.GRAY}
                                />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.labelRow}
                              onPress={() =>
                                startEditLabel(
                                  item.label,
                                  translateLabel(item.label),
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.resultLabel,
                                  corrected && styles.resultLabelFixed,
                                ]}
                              >
                                {displayName}
                              </Text>
                              {corrected ? (
                                <View style={styles.correctedBadge}>
                                  <Text style={styles.correctedBadgeText}>
                                    corrigido
                                  </Text>
                                </View>
                              ) : (
                                <Ionicons
                                  name="pencil-outline"
                                  size={13}
                                  color={COLORS.GRAY}
                                  style={{ marginLeft: 4 }}
                                />
                              )}
                            </TouchableOpacity>
                          )}
                          <Text style={styles.resultConf}>
                            {Math.round((item.confiancaMedia ?? 0) * 100)}%
                            {corrected
                              ? ` · YOLO: "${translateLabel(item.label)}"`
                              : ''}
                          </Text>
                        </View>
                        <View style={styles.resultBadge}>
                          <Text style={styles.resultQtd}>
                            {item.quantidade}x
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total detectado</Text>
                    <Text style={styles.totalValue}>
                      {detectionResult.summary.totalGeral}{' '}
                      {detectionResult.summary.totalGeral !== 1
                        ? 'itens'
                        : 'item'}
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
          </KeyboardAvoidingView>
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
    flex: 1,
    minHeight: 280,
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

  // Modal tela cheia
  modalFull: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
  },
  modalImage: {
    width: '100%',
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalImagePlaceholder: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPanel: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '50%',
  },
  modalPanelHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalBody: { maxHeight: 160 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  resultMid: { flex: 1, minWidth: 0 },
  labelRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  resultLabelFixed: { color: COLORS.PRIMARY },
  correctedBadge: {
    backgroundColor: '#1a3a1a',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 5,
  },
  correctedBadgeText: {
    color: COLORS.PRIMARY,
    fontSize: 10,
    fontWeight: '600',
  },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: COLORS.WHITE,
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  editBtn: { padding: 4 },
  resultBadge: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  resultQtd: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 14 },
  resultLabel: { color: COLORS.WHITE, fontSize: 14, fontWeight: '600' },
  resultConf: { color: COLORS.GRAY, fontSize: 12, marginTop: 2 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  totalLabel: { color: COLORS.GRAY, fontWeight: 'bold' },
  totalValue: { color: COLORS.PRIMARY, fontWeight: 'bold', fontSize: 16 },
  noResultBox: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  noResultText: { color: COLORS.GRAY, textAlign: 'center', lineHeight: 22 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
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

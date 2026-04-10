import { detectWithYolo, summarizeDetections } from './yoloService';
import { createInventoryItem } from './inventoryService';

/**
 * Converte URI de imagem para base64.
 * Mantido isolado para facilitar testes e reuso.
 */
async function imageUriToBase64(imageUri) {
  if (!imageUri) throw new Error('imageUri inválido.');

  const response = await fetch(imageUri);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        reject(new Error('Falha ao converter imagem para base64.'));
        return;
      }
      resolve(base64);
    };

    reader.onerror = () => reject(new Error('Erro ao ler imagem.'));
    reader.readAsDataURL(blob);
  });
}

function buildPayload({
  summary,
  detections,
  yoloMeta,
  usuarioId,
  usuarioNome,
  usuarioRole,
  local,
  fotoUrl,
  metadata,
}) {
  return {
    scanId: `scan_${usuarioId || 'anon'}_${Date.now()}`,
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

    usuarioId: usuarioId || '',
    usuarioNome: usuarioNome || '',
    usuarioRole: usuarioRole || 'user',

    local: local || '',
    latitude: metadata?.latitude ?? null,
    longitude: metadata?.longitude ?? null,
    fotoUrl: fotoUrl || '',
  };
}

/**
 * Pipeline de scanner:
 * 1) normaliza imagem (uri/base64)
 * 2) chama YOLO API
 * 3) resume detecções
 * 4) salva no Firestore
 */
export async function processScan({
  imageUri,
  imageBase64,
  usuarioId,
  usuarioNome,
  usuarioRole = 'user',
  local = '',
  latitude = null,
  longitude = null,
  empresaId = null,
  fotoUrl = '',
}) {
  try {
    let base64 = imageBase64;

    if (!base64 && imageUri) {
      base64 = await imageUriToBase64(imageUri);
    }

    if (!base64) {
      throw new Error('Imagem não informada para análise.');
    }

    const yoloResult = await detectWithYolo(base64);
    const detections = Array.isArray(yoloResult?.detections)
      ? yoloResult.detections
      : [];
    const summary = summarizeDetections(detections);

    const payload = buildPayload({
      summary,
      detections,
      yoloMeta: yoloResult?.meta,
      usuarioId,
      usuarioNome,
      usuarioRole,
      local,
      fotoUrl,
      metadata: { latitude, longitude, empresaId },
    });

    const id = await createInventoryItem(payload);

    return {
      success: true,
      id,
      payload,
    };
  } catch (error) {
    console.error('Erro no scanner pipeline:', error);

    return {
      success: false,
      message: error?.message || 'Erro ao processar auditoria.',
      error,
    };
  }
}

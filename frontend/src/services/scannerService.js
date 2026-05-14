import { detectWithYolo, summarizeDetections } from './yoloService';
import { createInventoryItem } from './inventoryService';
import {
  checkInferenceSLA,
  recordInferenceMetric,
} from './inferenceMetricsService';
import { enqueue } from './offlineScanQueueService';
import logger from '../utils/logger';

function isNetworkError(error) {
  const msg = error?.message?.toLowerCase() ?? '';
  return (
    msg.includes('network') ||
    msg.includes('connection') ||
    msg.includes('tempo limite') ||
    msg.includes('yolo_api_url')
  );
}

/**
 * Converte URI de imagem para base64.
 * Exportado para reuso em componentes (ex: ScannerScreen).
 */
export async function imageUriToBase64(imageUri) {
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

    const inferenceStart = Date.now();
    const yoloResult = await detectWithYolo(base64);
    const inferenceMs = Date.now() - inferenceStart;

    const detections = Array.isArray(yoloResult?.detections)
      ? yoloResult.detections
      : [];
    const summary = summarizeDetections(detections);

    // Registra telemetria de performance (fire-and-forget, não bloqueia)
    const meta = yoloResult?.meta ?? {};
    recordInferenceMetric({
      inferenceMs,
      yoloCount: meta?.pipeline?.yolo_count ?? detections.length,
      rfdetrCount: meta?.pipeline?.sam_count ?? 0,
      mergedCount: detections.length,
      usuarioId: usuarioId ?? '',
      empresaId: empresaId ?? '',
      success: true,
    });

    // Alerta se o tempo violou o SLA (loga no Sentry sem parar o fluxo)
    checkInferenceSLA(inferenceMs);

    const payload = buildPayload({
      summary,
      detections,
      yoloMeta: meta,
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
    logger.error('Erro no scanner pipeline:', error);

    recordInferenceMetric({
      inferenceMs: 0,
      yoloCount: 0,
      rfdetrCount: 0,
      mergedCount: 0,
      usuarioId: usuarioId ?? '',
      empresaId: empresaId ?? '',
      success: false,
      errorSource: error?.message ?? 'unknown',
    });

    // Erro de rede → enfileira para processar quando a conexão voltar
    if (isNetworkError(error)) {
      await enqueue({
        imageUri,
        imageBase64,
        usuarioId,
        usuarioNome,
        usuarioRole,
        local,
        latitude,
        longitude,
        empresaId,
        fotoUrl,
      });
      return {
        success: false,
        queued: true,
        message:
          'Sem conexão. Scan salvo e será enviado automaticamente ao reconectar.',
        error,
      };
    }

    return {
      success: false,
      queued: false,
      message: error?.message || 'Erro ao processar auditoria.',
      error,
    };
  }
}

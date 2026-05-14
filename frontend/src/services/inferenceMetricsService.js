/**
 * Telemetria de performance de inferência YOLO por dispositivo.
 *
 * Registra no Firestore o tempo de inferência, modelo de celular e OS
 * para monitorar SLA de < 30s em diferentes hardwares de campo em Manaus.
 *
 * Coleção: /inference_metrics/{docId}
 * Acesso: apenas Super Admin pode ler — dados puramente técnicos.
 */
import { Platform } from 'react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { COLLECTIONS } from '../constants/collections';
import logger from '../utils/logger';
import { setSentryInferenceContext } from '../config/sentryConfig';

/**
 * Retorna identificador do dispositivo no formato "<OS>/<versão>".
 * Suficiente para correlacionar performance entre modelos de celular.
 */
function getDeviceModel() {
  return `${Platform.OS}/${Platform.Version}`;
}

/**
 * Registra uma medição de inferência no Firestore e no contexto Sentry.
 *
 * @param {{
 *   inferenceMs: number,
 *   yoloCount: number,
 *   samCount: number,
 *   mergedCount: number,
 *   usuarioId: string,
 *   empresaId: string,
 *   success: boolean,
 *   errorSource?: string,
 * }} data
 */
export async function recordInferenceMetric({
  inferenceMs,
  yoloCount,
  samCount,
  mergedCount,
  usuarioId,
  empresaId,
  success,
  errorSource = null,
}) {
  const deviceModel = getDeviceModel();

  // Atualiza contexto Sentry para que qualquer erro subsequente inclua hardware
  setSentryInferenceContext({ deviceModel, inferenceMs });

  const metric = {
    deviceModel,
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    inferenceMs,
    yoloCount,
    samCount,
    mergedCount,
    success,
    errorSource,
    usuarioId,
    empresaId,
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, COLLECTIONS.INFERENCE_METRICS), metric);
  } catch (err) {
    // Falha silenciosa — telemetria nunca bloqueia o fluxo principal
    logger.warn('Falha ao salvar métrica de inferência:', err?.message);
  }
}

/**
 * Retorna o SLA de inferência esperado por plataforma.
 * Usado para logar alertas quando o tempo real excede o esperado.
 */
export function getInferenceSLA() {
  return {
    target_ms: 30000, // meta: < 30s
    warn_ms: 20000, // alerta amarelo acima de 20s
    critical_ms: 55000, // alerta crítico (próximo ao timeout do backend)
  };
}

/**
 * Verifica se o tempo de inferência violou o SLA e loga no Sentry.
 *
 * @param {number} inferenceMs
 */
export function checkInferenceSLA(inferenceMs) {
  const { warn_ms, critical_ms } = getInferenceSLA();

  if (inferenceMs >= critical_ms) {
    logger.error(
      `SLA crítico de inferência violado: ${inferenceMs}ms (limite: ${critical_ms}ms)`,
      new Error('InferenceSLACritical'),
      { inference_ms: inferenceMs },
    );
    return 'critical';
  }

  if (inferenceMs >= warn_ms) {
    logger.warn(`SLA de inferência em atenção: ${inferenceMs}ms`);
    return 'warn';
  }

  return 'ok';
}

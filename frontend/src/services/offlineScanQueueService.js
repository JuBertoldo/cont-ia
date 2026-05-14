/**
 * Fila offline de scans.
 *
 * Quando o operador está em campo sem conexão, o scan é salvo localmente
 * no AsyncStorage. Ao reconectar, `syncPendingScans()` processa a fila
 * automaticamente e salva cada scan no Firestore.
 *
 * Fluxo:
 *   1. `processScan()` falha por erro de rede
 *   2. `enqueue()` salva o scan localmente
 *   3. A cada 30s, verifica conectividade (fetch HEAD no /health do backend)
 *      e drena a fila automaticamente quando a rede retorna
 *
 * Injeção de dependência:
 *   `syncPendingScans` e `startConnectivityListener` recebem `processFunction`
 *   como parâmetro em vez de importar `processScan` diretamente.
 *   Isso quebra a dependência circular com scannerService.js.
 *
 * Sem dependências externas de rede — usa fetch nativo do React Native.
 *
 * Coleção local (AsyncStorage): OFFLINE_SCAN_QUEUE_KEY → JSON[]
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import logger from '../utils/logger';

const QUEUE_KEY = '@contia:offline_scan_queue';
const CONNECTIVITY_CHECK_INTERVAL_MS = 30_000; // verifica a cada 30 segundos
const CONNECTIVITY_TIMEOUT_MS = 5_000;

/** Retorna todos os scans pendentes na fila local. */
async function getQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persiste a fila atualizada no AsyncStorage. */
async function saveQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Verifica conectividade com o backend fazendo um HEAD no /health.
 * Não depende de @react-native-community/netinfo.
 *
 * @returns {Promise<boolean>} true se o backend estiver acessível
 */
async function isBackendReachable() {
  const baseUrl = Config.YOLO_API_URL || '';
  if (!baseUrl) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      CONNECTIVITY_TIMEOUT_MS,
    );
    const response = await fetch(`${baseUrl}/health`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Adiciona um scan à fila offline.
 *
 * imageBase64 é EXCLUÍDO intencionalmente — pode ter até 3 MB por scan
 * e causaria estouro de memória no AsyncStorage em celulares Android básicos.
 * Na sincronização, processScan() reconverte imageUri → base64.
 *
 * @param {object} scanArgs — os mesmos argumentos passados para processScan()
 */
export async function enqueue(scanArgs) {
  const { imageBase64: _ignored, ...safeArgs } = scanArgs;
  const queue = await getQueue();
  queue.push({ ...safeArgs, _queuedAt: Date.now() });
  await saveQueue(queue);
  logger.info(`Scan adicionado à fila offline. Total na fila: ${queue.length}`);
}

/** Retorna o número de scans pendentes na fila. */
export async function getPendingCount() {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Processa todos os scans pendentes na fila offline.
 *
 * Recebe `processFunction` como parâmetro (injeção de dependência) em vez de
 * importar `processScan` diretamente — evita dependência circular com scannerService.
 *
 * - Scans bem-sucedidos são removidos da fila.
 * - Scans que falham novamente permanecem na fila para a próxima tentativa.
 *
 * @param {function} processFunction — função com a mesma assinatura de processScan()
 * @returns {Promise<{ synced: number, failed: number }>}
 */
export async function syncPendingScans(processFunction) {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  logger.info(`Sincronizando ${queue.length} scan(s) offline...`);

  const remaining = [];
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    const { _queuedAt, ...scanArgs } = item;
    try {
      const result = await processFunction(scanArgs);
      if (result.success) {
        synced++;
        logger.info(
          `Scan offline sincronizado (enfileirado em ${new Date(
            _queuedAt,
          ).toISOString()})`,
        );
      } else {
        remaining.push(item);
        failed++;
      }
    } catch {
      remaining.push(item);
      failed++;
    }
  }

  await saveQueue(remaining);
  logger.info(`Sincronização concluída: ${synced} ok, ${failed} pendentes.`);
  return { synced, failed };
}

/**
 * Inicia o listener de conectividade via polling (sem dependências externas).
 *
 * A cada CONNECTIVITY_CHECK_INTERVAL_MS (30s), faz HEAD no /health do backend.
 * Se o backend responder e houver scans na fila, sincroniza automaticamente.
 *
 * Recebe `processFunction` via injeção de dependência para evitar
 * dependência circular com scannerService.js.
 *
 * @param {function} processFunction — função com a mesma assinatura de processScan()
 * @returns {() => void} cleanup — cancela o intervalo; use no return do useEffect
 */
export function startConnectivityListener(processFunction) {
  const intervalId = setInterval(async () => {
    try {
      const reachable = await isBackendReachable();
      if (!reachable) return;

      const count = await getPendingCount();
      if (count > 0) {
        logger.info(
          `Backend acessível. Sincronizando ${count} scan(s) offline...`,
        );
        await syncPendingScans(processFunction);
      }
    } catch {
      // falha silenciosa — tentará novamente no próximo intervalo
    }
  }, CONNECTIVITY_CHECK_INTERVAL_MS);

  return () => clearInterval(intervalId);
}

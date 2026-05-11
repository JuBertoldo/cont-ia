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
 *   3. Ao detectar conexão, `syncPendingScans()` drena a fila
 *
 * Injeção de dependência:
 *   `syncPendingScans` e `startConnectivityListener` recebem `processFunction`
 *   como parâmetro em vez de importar `processScan` diretamente.
 *   Isso quebra a dependência circular com scannerService.js.
 *
 * Coleção local (AsyncStorage): OFFLINE_SCAN_QUEUE_KEY → JSON[]
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import logger from '../utils/logger';

const QUEUE_KEY = '@contia:offline_scan_queue';

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
 * Inicia o listener de conectividade.
 * Quando a rede voltar, dispara `syncPendingScans(processFunction)` automaticamente.
 *
 * Recebe `processFunction` via injeção de dependência para evitar
 * dependência circular com scannerService.js.
 *
 * @param {function} processFunction — função com a mesma assinatura de processScan()
 * @returns {() => void} unsubscribe — use no cleanup do useEffect
 */
export function startConnectivityListener(processFunction) {
  const unsubscribe = NetInfo.addEventListener(async state => {
    if (state.isConnected && state.isInternetReachable) {
      const count = await getPendingCount();
      if (count > 0) {
        logger.info(
          `Conexão restaurada. Sincronizando ${count} scan(s) offline...`,
        );
        await syncPendingScans(processFunction);
      }
    }
  });
  return unsubscribe;
}

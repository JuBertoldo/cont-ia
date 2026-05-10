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
 * Coleção local (AsyncStorage): OFFLINE_SCAN_QUEUE_KEY → JSON[]
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { processScan } from './scannerService';
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
 * Cada entrada inclui os argumentos originais do `processScan` + timestamp.
 *
 * @param {object} scanArgs — os mesmos argumentos passados para processScan()
 */
export async function enqueue(scanArgs) {
  const queue = await getQueue();
  queue.push({ ...scanArgs, _queuedAt: Date.now() });
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
 * Chamada automaticamente ao detectar reconexão.
 *
 * - Scans bem-sucedidos são removidos da fila.
 * - Scans que falham novamente permanecem na fila para a próxima tentativa.
 *
 * @returns {{ synced: number, failed: number }}
 */
export async function syncPendingScans() {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  logger.info(`Sincronizando ${queue.length} scan(s) offline...`);

  const remaining = [];
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    const { _queuedAt, ...scanArgs } = item;
    try {
      const result = await processScan(scanArgs);
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
 * Quando a rede voltar, dispara `syncPendingScans()` automaticamente.
 * Retorna a função de cleanup para usar em useEffect.
 *
 * @returns {() => void} unsubscribe
 */
export function startConnectivityListener() {
  const unsubscribe = NetInfo.addEventListener(async state => {
    if (state.isConnected && state.isInternetReachable) {
      const count = await getPendingCount();
      if (count > 0) {
        logger.info(
          `Conexão restaurada. Sincronizando ${count} scan(s) offline...`,
        );
        await syncPendingScans();
      }
    }
  });
  return unsubscribe;
}

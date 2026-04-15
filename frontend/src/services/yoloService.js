import { Platform } from 'react-native';
import { apiClient } from './apiClient';

const YOLO_ENDPOINT = '/v1/detect';

function ensureBase64(imageBase64) {
  if (
    !imageBase64 ||
    typeof imageBase64 !== 'string' ||
    imageBase64.trim().length < 10
  ) {
    throw new Error('Imagem inválida para análise YOLO.');
  }
}

function normalizeDetection(det) {
  return {
    label: String(det?.label || 'desconhecido'),
    confidence: Number(det?.confidence ?? 0),
    bbox: Array.isArray(det?.bbox) ? det.bbox : [],
  };
}

export async function detectWithYolo(imageBase64) {
  ensureBase64(imageBase64);

  const data = await apiClient.post(YOLO_ENDPOINT, {
    image_base64: imageBase64,
    source: 'mobile',
    platform: Platform.OS,
  });

  const detections = Array.isArray(data?.detections)
    ? data.detections.map(normalizeDetection)
    : [];

  return { detections, meta: data?.meta || {} };
}

export function summarizeDetections(detections = []) {
  if (!Array.isArray(detections) || detections.length === 0) {
    return {
      itens: [],
      totalGeral: 0,
      item: 'não identificado',
      classificacao: 'indefinido',
      quantidade: 0,
      descricao: 'sem objetos detectados',
      labels: [],
    };
  }

  const labels = detections.map(d => d.label);

  // Agrupa por label: conta unidades e calcula confiança média
  const grouped = detections.reduce((acc, det) => {
    const label = det.label || 'desconhecido';
    if (!acc[label]) acc[label] = { quantidade: 0, totalConfianca: 0 };
    acc[label].quantidade += 1;
    acc[label].totalConfianca += Number(det.confidence ?? 0);
    return acc;
  }, {});

  // Ordena do mais frequente para o menos frequente
  const itens = Object.entries(grouped)
    .sort((a, b) => b[1].quantidade - a[1].quantidade)
    .map(([label, data]) => ({
      label,
      quantidade: data.quantidade,
      confiancaMedia:
        Math.round((data.totalConfianca / data.quantidade) * 100) / 100,
    }));

  const mainItem = itens[0]?.label || 'não identificado';
  const totalGeral = detections.length;
  const descricao = itens.map(i => `${i.label}: ${i.quantidade}`).join(' | ');

  return {
    itens,
    totalGeral,
    item: mainItem,
    classificacao: 'detecção yolo',
    quantidade: totalGeral,
    descricao,
    labels,
  };
}

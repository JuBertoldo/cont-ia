import { analyzeImageWithVision } from './visionService';
import { analyzeWithClaudeFunction } from './aiService';

export const analyzeImageWithScannerPipeline = async (base64Image) => {
  try {
    const visionResult = await analyzeImageWithVision(base64Image);

    const aiResult = await analyzeWithClaudeFunction({
      labels: visionResult.labels || [],
      objects: visionResult.objects || [],
    });

    return {
      item: aiResult.item || 'não identificado',
      classificacao: aiResult.classificacao || 'indefinido',
      quantidade: aiResult.quantidade ?? 0,
      repetidos: aiResult.repetidos ?? 0,
      descricao: aiResult.descricao || '',
      local: aiResult.local || '',
      vision: visionResult,
    };
  } catch (error) {
    console.error('Erro no scanner pipeline:', error);
    throw error;
  }
};
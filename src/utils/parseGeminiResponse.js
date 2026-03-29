export const parseGeminiResponse = (text) => {
  if (!text) {
    throw new Error('Resposta vazia do Gemini.');
  }

  const cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Erro ao fazer parse da resposta do Gemini:', cleaned);
    throw new Error('A IA não retornou um JSON válido.');
  }
};
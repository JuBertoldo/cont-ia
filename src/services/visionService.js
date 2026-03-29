const GOOGLE_VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;

export const analyzeImageWithVision = async (base64Image) => {
  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'LABEL_DETECTION',
                  maxResults: 10,
                },
                {
                  type: 'OBJECT_LOCALIZATION',
                  maxResults: 10,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message || 'Falha ao analisar imagem com Google Vision.'
      );
    }

    const result = data.responses?.[0] || {};

    const labels = (result.labelAnnotations || []).map((item) => item.description);
    const objects = (result.localizedObjectAnnotations || []).map((item) => item.name);

    return {
      labels,
      objects,
      raw: result,
    };
  } catch (error) {
    console.error('Erro no Vision Service:', error);
    throw error;
  }
};
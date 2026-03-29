const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const Anthropic = require("@anthropic-ai/sdk");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

exports.analyzeInventory = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
    try {
      // Exige usuário autenticado
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado.");
      }

      const data = request?.data ?? {};
      const labels = Array.isArray(data.labels) ? data.labels : [];
      const objects = Array.isArray(data.objects) ? data.objects : [];

      // Normaliza entradas para strings não vazias
      const normalizedLabels = labels.map((v) => String(v).trim()).filter(Boolean);
      const normalizedObjects = objects.map((v) => String(v).trim()).filter(Boolean);

      // Evita chamada à IA se não houver dados
      if (!normalizedLabels.length && !normalizedObjects.length) {
        return {
          item: "não identificado",
          classificacao: "indefinido",
          quantidade: 0,
          repetidos: 0,
          descricao: "sem dados de detecção",
          local: "",
        };
      }

      const anthropic = new Anthropic({
        apiKey: ANTHROPIC_API_KEY.value(),
      });

      const labelsText = normalizedLabels.concat(normalizedObjects).join(", ");

      const prompt = `
Você receberá labels e objetos detectados em uma imagem de inventário.
Retorne APENAS JSON válido com o formato:
{
  "item": "nome técnico do objeto principal",
  "classificacao": "categoria do item",
  "quantidade": 1,
  "repetidos": 0,
  "descricao": "descrição curta",
  "local": ""
}

Labels/Objetos:
${labelsText}

Se não for possível identificar, retorne:
{
  "item": "não identificado",
  "classificacao": "indefinido",
  "quantidade": 0,
  "repetidos": 0,
  "descricao": "imagem insuficiente",
  "local": ""
}
`.trim();

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 400,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      });

      let rawText = "";
      if (response && Array.isArray(response.content)) {
        const textBlock = response.content.find((c) => c && c.type === "text");
        rawText = textBlock?.text ? String(textBlock.text).trim() : "";
      }

      if (!rawText) {
        throw new HttpsError("internal", "Resposta vazia da IA.");
      }

      // Remove markdown e extrai JSON
      const cleaned = rawText.replace(/```json|```/gi, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new HttpsError("internal", "IA não retornou JSON válido.");
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        throw new HttpsError("internal", "IA retornou JSON inválido.");
      }

      const toNumber = (value, defaultValue = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : defaultValue;
      };

      return {
        item:
          typeof parsed.item === "string" && parsed.item.trim()
            ? parsed.item.trim()
            : "não identificado",
        classificacao:
          typeof parsed.classificacao === "string" && parsed.classificacao.trim()
            ? parsed.classificacao.trim()
            : "indefinido",
        quantidade: toNumber(parsed.quantidade, 0),
        repetidos: toNumber(parsed.repetidos, 0),
        descricao: typeof parsed.descricao === "string" ? parsed.descricao.trim() : "",
        local: typeof parsed.local === "string" ? parsed.local.trim() : "",
      };
    } catch (error) {
      console.error("analyzeInventory error:", {
        message: error?.message,
        stack: error?.stack,
        status: error?.status,
        type: error?.type,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      // Temporariamente retornando a mensagem real para facilitar debug no app
      throw new HttpsError("internal", error?.message || "Erro ao analisar inventário.");
    }
  }
);
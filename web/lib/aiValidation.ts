/**
 * Camada de abstração para validação de dataset com IA.
 *
 * Provedor atual: Gemini Flash (free tier — 1M tokens/dia).
 * Migração para Claude: alterar AI_PROVIDER=claude no .env.
 *
 * Regra de negócio: feature exclusiva do plano Enterprise.
 * Custo: $0 com Gemini / ~$0.001/validação com Claude Haiku.
 */

export interface ValidationResult {
  valid: boolean;
  suggestedLabel: string;
  confidence: number;
  observation: string;
  provider: "gemini" | "claude";
}

const VALIDATION_PROMPT = (label: string) => `
Analise esta imagem e responda em JSON:
- O objeto principal da imagem é um(a) "${label}"?
- Se não, qual é o objeto correto?

Responda APENAS com JSON válido no formato:
{
  "valid": true/false,
  "suggestedLabel": "nome do objeto em português",
  "confidence": 0.0-1.0,
  "observation": "observação curta sobre a imagem"
}
`;

async function validateWithGemini(
  imageBase64: string,
  label: string
): Promise<ValidationResult> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""
  );
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent([
    VALIDATION_PROMPT(label),
    {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg",
      },
    },
  ]);

  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Resposta Gemini sem JSON válido");

  const parsed = JSON.parse(jsonMatch[0]);
  return { ...parsed, provider: "gemini" };
}

async function validateWithClaude(
  imageBase64: string,
  label: string
): Promise<ValidationResult> {
  // Chamada via API route do Next.js para não expor a chave no cliente
  const res = await fetch("/api/validate-dataset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, label }),
  });
  if (!res.ok) throw new Error("Claude API falhou");
  return res.json();
}

export async function validateDatasetEntry(
  imageBase64: string,
  label: string
): Promise<ValidationResult> {
  const provider =
    (process.env.NEXT_PUBLIC_AI_PROVIDER as "gemini" | "claude") ?? "gemini";
  return provider === "claude"
    ? validateWithClaude(imageBase64, label)
    : validateWithGemini(imageBase64, label);
}

export function shouldAutoApprove(result: ValidationResult): boolean {
  return result.valid && result.confidence >= 0.85;
}

export function shouldAutoReject(result: ValidationResult): boolean {
  return !result.valid && result.confidence >= 0.90;
}

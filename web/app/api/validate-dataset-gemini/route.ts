/**
 * API Route — Validação de dataset com Gemini Flash (fetch nativo, sem SDK).
 * Mantém a chave Gemini no servidor, não exposta ao cliente.
 * Free tier: 1M tokens/dia — suficiente para o TCC.
 */

import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const VALIDATION_PROMPT = (label: string) => `
Analise esta imagem e responda em JSON:
- O objeto principal da imagem é um(a) "${label}"?
- Se não, qual é o objeto correto?

Responda APENAS com JSON válido:
{
  "valid": true/false,
  "suggestedLabel": "nome do objeto em português",
  "confidence": 0.0-1.0,
  "observation": "observação curta"
}
`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 503 });
  }

  const { imageBase64, label } = await req.json();
  if (!imageBase64 || !label) {
    return NextResponse.json({ error: "imageBase64 e label são obrigatórios" }, { status: 400 });
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: VALIDATION_PROMPT(label) },
            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 256, temperature: 0.1 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return NextResponse.json({ error: err.error?.message ?? "Gemini API falhou" }, { status: 502 });
  }

  const data = await response.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Resposta sem JSON válido" }, { status: 500 });
  }

  return NextResponse.json({ ...JSON.parse(jsonMatch[0]), provider: "gemini" });
}

/**
 * API Route — Validação de dataset com Gemini Flash (free tier).
 * Mantém a chave Gemini no servidor, não exposta ao cliente.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent([
    VALIDATION_PROMPT(label),
    { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
  ]);

  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Resposta sem JSON válido" }, { status: 500 });
  }

  return NextResponse.json({ ...JSON.parse(jsonMatch[0]), provider: "gemini" });
}

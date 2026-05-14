/**
 * API Route — Validação de dataset com Claude API.
 * Só ativa quando AI_PROVIDER=claude no .env.
 * Mantém a chave Claude no servidor (não exposta ao cliente).
 *
 * Custo estimado: ~$0.001 por validação (Claude Haiku 4.5).
 * Feature exclusiva do plano Enterprise.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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
  const { imageBase64, label } = await req.json();

  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
          },
          { type: "text", text: VALIDATION_PROMPT(label) },
        ],
      },
    ],
  });

  const text = (message.content[0] as { type: "text"; text: string }).text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 500 });

  return NextResponse.json({ ...JSON.parse(jsonMatch[0]), provider: "claude" });
}

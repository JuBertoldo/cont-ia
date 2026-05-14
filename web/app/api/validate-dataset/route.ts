/**
 * API Route — Validação de dataset com Claude API (fetch nativo, sem SDK).
 * Mantém a chave Claude no servidor, não exposta ao cliente.
 *
 * Auth: verifica INTERNAL_API_SECRET no header X-Internal-Secret.
 * Custo: ~$0.001/validação com Claude Haiku. Feature plano Enterprise.
 */

import { NextRequest, NextResponse } from "next/server";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001";

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
  // Proteção por segredo compartilhado — evita chamadas externas ao endpoint
  const secret = req.headers.get("X-Internal-Secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CLAUDE_API_KEY não configurada" }, { status: 503 });
  }

  const { imageBase64, label } = await req.json();
  if (!imageBase64 || !label) {
    return NextResponse.json({ error: "imageBase64 e label são obrigatórios" }, { status: 400 });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
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
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return NextResponse.json({ error: err.error?.message ?? "Claude API falhou" }, { status: 502 });
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? "";
  const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Resposta sem JSON válido" }, { status: 500 });
  }

  return NextResponse.json({ ...JSON.parse(jsonMatch[0]), provider: "claude" });
}

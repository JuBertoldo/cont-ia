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
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";

// Inicializa Firebase Admin para verificar o token
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

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
  // Verifica token Firebase — apenas super_admin pode chamar
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    if (decoded.role !== "super_admin") {
      return NextResponse.json({ error: "Acesso negado — plano Enterprise" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CLAUDE_API_KEY não configurada" }, { status: 503 });
  }

  const { imageBase64, label } = await req.json();
  if (!imageBase64 || !label) {
    return NextResponse.json({ error: "imageBase64 e label são obrigatórios" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
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
  });

  const block = message.content[0];
  if (block.type !== "text") {
    return NextResponse.json({ error: "Resposta inesperada da IA" }, { status: 500 });
  }
  const jsonMatch = block.text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Resposta sem JSON válido" }, { status: 500 });
  }

  return NextResponse.json({ ...JSON.parse(jsonMatch[0]), provider: "claude" });
}

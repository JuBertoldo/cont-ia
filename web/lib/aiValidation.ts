/**
 * Camada de abstração para validação de dataset com IA.
 *
 * Ambos os provedores chamam API routes do Next.js (server-side),
 * garantindo que nenhuma chave de API seja exposta no cliente.
 *
 * Provedor ativo: AI_PROVIDER no .env (gemini | claude)
 * - gemini: Gemini 1.5 Flash, free tier — padrão para TCC
 * - claude: Claude Haiku 4.5, ~$0.001/validação — plano Enterprise
 */

import { getIdToken } from "firebase/auth";
import { auth } from "./firebase";

export interface ValidationResult {
  valid: boolean;
  suggestedLabel: string;
  confidence: number;
  observation: string;
  provider: "gemini" | "claude";
}

async function getAuthHeader(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await getIdToken(user);
  return `Bearer ${token}`;
}

async function callValidationRoute(
  endpoint: string,
  imageBase64: string,
  label: string,
  withAuth = false
): Promise<ValidationResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withAuth) headers["Authorization"] = await getAuthHeader();

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ imageBase64, label }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Erro ${res.status} na validação IA`);
  }
  return res.json();
}

export async function validateDatasetEntry(
  imageBase64: string,
  label: string
): Promise<ValidationResult> {
  const provider =
    (process.env.NEXT_PUBLIC_AI_PROVIDER as "gemini" | "claude") ?? "gemini";

  if (provider === "claude") {
    return callValidationRoute("/api/validate-dataset", imageBase64, label, true);
  }
  return callValidationRoute("/api/validate-dataset-gemini", imageBase64, label);
}

export function shouldAutoApprove(result: ValidationResult): boolean {
  return result.valid && result.confidence >= 0.85;
}

export function shouldAutoReject(result: ValidationResult): boolean {
  return !result.valid && result.confidence >= 0.90;
}

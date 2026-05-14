"use client";

import { useEffect, useState } from "react";
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, updateDoc, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import type { ScanDataset, DatasetStatus } from "@/types";
import { validateDatasetEntry, shouldAutoApprove, shouldAutoReject } from "@/lib/aiValidation";
import { Sparkles, CheckCircle, XCircle, Clock, Image as ImgIcon, Zap } from "lucide-react";

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string ?? 0);
}

export default function DatasetPage() {
  const { user } = useAuth();
  const [scans, setScans] = useState<ScanDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [selected, setSelected] = useState<ScanDataset | null>(null);
  const [stats, setStats] = useState({ pendentes: 0, validados: 0, rejeitados: 0 });

  async function loadScans() {
    const [pendSnap, valSnap, rejSnap] = await Promise.all([
      getDocs(query(collection(db, "inventario"), where("statusDataset", "==", "pendente"), orderBy("createdAt", "desc"), limit(50))),
      getDocs(query(collection(db, "inventario"), where("statusDataset", "==", "validado"))),
      getDocs(query(collection(db, "inventario"), where("statusDataset", "==", "rejeitado"))),
    ]);
    const list = pendSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        usuarioId: data.usuarioId,
        usuarioNome: data.usuarioNome,
        empresaId: data.empresaId,
        item: data.item,
        fotoUrl: data.fotoUrl,
        detections: data.detections ?? [],
        correcoes: data.correcoes ?? [],
        statusDataset: data.statusDataset as DatasetStatus,
        aiValidacao: data.aiValidacao,
        createdAt: toDate(data.createdAt),
      } as ScanDataset;
    });
    setScans(list);
    setStats({ pendentes: pendSnap.size, validados: valSnap.size, rejeitados: rejSnap.size });
    setLoading(false);
  }

  useEffect(() => { loadScans(); }, []);

  async function handleAction(id: string, status: "validado" | "rejeitado") {
    setValidating(id);
    await updateDoc(doc(db, "inventario", id), {
      statusDataset: status,
      validadoPor: user?.nome,
      validadoAt: serverTimestamp(),
    });
    setScans((prev) => prev.filter((s) => s.id !== id));
    setStats((prev) => ({
      ...prev,
      pendentes: prev.pendentes - 1,
      [status === "validado" ? "validados" : "rejeitados"]:
        prev[status === "validado" ? "validados" : "rejeitados"] + 1,
    }));
    if (selected?.id === id) setSelected(null);
    setValidating(null);
  }

  async function runAiValidation() {
    if (!scans.length) return;
    setAiRunning(true);
    let autoApproved = 0; let autoRejected = 0;

    for (const scan of scans) {
      if (!scan.fotoUrl || !scan.item) continue;
      try {
        const res = await fetch(scan.fotoUrl);
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(blob);
        });
        const result = await validateDatasetEntry(base64, scan.item);
        await updateDoc(doc(db, "inventario", scan.id), { aiValidacao: result });

        if (shouldAutoApprove(result)) {
          await handleAction(scan.id, "validado");
          autoApproved++;
        } else if (shouldAutoReject(result)) {
          await handleAction(scan.id, "rejeitado");
          autoRejected++;
        }
      } catch { /* continua próximo */ }
    }
    alert(`IA concluída: ${autoApproved} aprovados, ${autoRejected} rejeitados automaticamente.`);
    setAiRunning(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dataset / Validação IA</h2>
          <p className="text-slate-400 text-sm mt-1">Curadoria de scans para treino do modelo YOLO</p>
        </div>
        {user?.role === "super_admin" && scans.length > 0 && (
          <button
            onClick={runAiValidation}
            disabled={aiRunning}
            className="flex items-center gap-2 bg-brand text-black font-bold px-5 py-2.5 rounded-xl hover:bg-brand-dark transition disabled:opacity-60"
          >
            <Zap size={16} />
            {aiRunning ? "Validando com IA..." : `Validar ${scans.length} com Gemini`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5 flex items-center gap-4">
          <Clock size={24} className="text-yellow-400" />
          <div><p className="text-2xl font-bold text-white">{stats.pendentes}</p><p className="text-xs text-slate-400">Pendentes</p></div>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5 flex items-center gap-4">
          <CheckCircle size={24} className="text-brand" />
          <div><p className="text-2xl font-bold text-white">{stats.validados}</p><p className="text-xs text-slate-400">Validados</p></div>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5 flex items-center gap-4">
          <XCircle size={24} className="text-red-400" />
          <div><p className="text-2xl font-bold text-white">{stats.rejeitados}</p><p className="text-xs text-slate-400">Rejeitados</p></div>
        </div>
      </div>

      {scans.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <CheckCircle size={48} className="mx-auto mb-3 text-brand/30" />
          <p>Nenhum scan pendente de validação.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {scans.map((scan) => (
            <button
              key={scan.id}
              onClick={() => setSelected(scan)}
              className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden hover:border-brand/50 transition text-left"
            >
              <div className="aspect-square relative bg-surface">
                {scan.fotoUrl ? (
                  <img src={scan.fotoUrl} alt={scan.item} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImgIcon size={32} className="text-slate-600" />
                  </div>
                )}
                {scan.aiValidacao && (
                  <div className="absolute top-2 right-2">
                    <Sparkles size={16} className={scan.aiValidacao.valid ? "text-brand" : "text-red-400"} />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-white truncate">{scan.item}</p>
                <p className="text-xs text-slate-400 truncate">{scan.usuarioNome}</p>
                {scan.aiValidacao && (
                  <p className={`text-xs mt-1 ${scan.aiValidacao.valid ? "text-brand" : "text-red-400"}`}>
                    IA: {Math.round(scan.aiValidacao.confidence * 100)}% — {scan.aiValidacao.valid ? "válido" : "inválido"}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAction(scan.id, "validado"); }}
                    disabled={validating === scan.id}
                    className="flex-1 bg-brand/10 border border-brand/30 text-brand text-xs py-1.5 rounded-lg hover:bg-brand/20 transition"
                  >
                    ✓
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAction(scan.id, "rejeitado"); }}
                    disabled={validating === scan.id}
                    className="flex-1 bg-red-900/20 border border-red-800 text-red-400 text-xs py-1.5 rounded-lg hover:bg-red-900/30 transition"
                  >
                    ✗
                  </button>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg">
            <img src={selected.fotoUrl} alt={selected.item} className="w-full max-h-72 object-cover rounded-t-2xl" />
            <div className="p-6 space-y-4">
              <div>
                <p className="text-lg font-bold text-white">{selected.item}</p>
                <p className="text-sm text-slate-400">{selected.usuarioNome} · {selected.empresaId}</p>
              </div>
              {selected.correcoes?.length > 0 && (
                <div className="bg-surface rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Correções do usuário</p>
                  {selected.correcoes.map((c, i) => (
                    <p key={i} className="text-sm text-slate-300">
                      <span className="text-red-400 line-through">{c.labelOriginal}</span>
                      {" → "}
                      <span className="text-brand">{c.labelCorrigido}</span>
                    </p>
                  ))}
                </div>
              )}
              {selected.aiValidacao && (
                <div className={`rounded-xl p-3 border ${selected.aiValidacao.valid ? "bg-brand/10 border-brand/30" : "bg-red-900/20 border-red-800"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={14} className={selected.aiValidacao.valid ? "text-brand" : "text-red-400"} />
                    <p className="text-xs font-medium text-white">Análise Gemini — {Math.round(selected.aiValidacao.confidence * 100)}% confiança</p>
                  </div>
                  <p className="text-xs text-slate-300">{selected.aiValidacao.observation}</p>
                  {selected.aiValidacao.suggestedLabel !== selected.item && (
                    <p className="text-xs text-yellow-400 mt-1">Sugestão: "{selected.aiValidacao.suggestedLabel}"</p>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="flex-1 border border-surface-border rounded-xl py-3 text-sm text-slate-300">Fechar</button>
                <button onClick={() => handleAction(selected.id, "rejeitado")} disabled={validating === selected.id}
                  className="flex-1 bg-red-900/30 border border-red-800 text-red-400 font-medium py-3 rounded-xl">Rejeitar</button>
                <button onClick={() => handleAction(selected.id, "validado")} disabled={validating === selected.id}
                  className="flex-1 bg-brand text-black font-bold py-3 rounded-xl">Validar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LicencaTool } from "@/types";
import { Key, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_LICENCAS: Omit<LicencaTool, "id">[] = [
  { nome: "YOLO11 (Ultralytics)", fornecedor: "Ultralytics", tipo: "anual", valor: 0, vencimento: new Date(2026, 11, 31), status: "ativa", observacao: "Licença AGPL — treinar modelo próprio antes do 1º cliente" },
  { nome: "MobileSAM", fornecedor: "Meta AI", tipo: "anual", valor: 0, vencimento: new Date(2099, 11, 31), status: "ativa", observacao: "Apache 2.0 — uso comercial permitido" },
  { nome: "Firebase (Spark)", fornecedor: "Google", tipo: "mensal", valor: 0, vencimento: new Date(2026, 11, 31), status: "ativa", observacao: "Free tier — monitorar cotas mensalmente" },
  { nome: "Apple Developer", fornecedor: "Apple", tipo: "anual", valor: 550, vencimento: new Date(2027, 2, 15), status: "ativa", observacao: "Necessário para App Store e APNs" },
  { nome: "Gemini Flash (Free Tier)", fornecedor: "Google", tipo: "mensal", valor: 0, vencimento: new Date(2099, 11, 31), status: "ativa", observacao: "Validação IA dataset — 1M tokens/dia grátis" },
];

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string ?? 0);
}

function statusFromDate(venc: Date): LicencaTool["status"] {
  const diff = venc.getTime() - Date.now();
  if (diff < 0) return "vencida";
  if (diff < 30 * 86400_000) return "vencendo";
  return "ativa";
}

const STATUS_CONFIG = {
  ativa: { label: "Ativa", color: "text-brand bg-brand/10 border-brand/30", icon: CheckCircle },
  vencendo: { label: "Vencendo em breve", color: "text-yellow-400 bg-yellow-900/20 border-yellow-800", icon: AlertTriangle },
  vencida: { label: "Vencida", color: "text-red-400 bg-red-900/20 border-red-800", icon: AlertTriangle },
};

export default function LicencasPage() {
  const [licencas, setLicencas] = useState<LicencaTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", fornecedor: "", tipo: "anual", valor: "0", vencimento: "", observacao: "" });

  useEffect(() => {
    getDocs(collection(db, "licencas")).then((snap) => {
      if (snap.empty) {
        // seed com licenças padrão
        Promise.all(DEFAULT_LICENCAS.map((l, i) =>
          setDoc(doc(db, "licencas", `lic_${i}`), l)
        )).then(() => getDocs(collection(db, "licencas"))).then((s2) => {
          setLicencas(s2.docs.map((d) => ({ id: d.id, ...d.data(), vencimento: toDate(d.data().vencimento), status: statusFromDate(toDate(d.data().vencimento)) } as LicencaTool)));
          setLoading(false);
        });
      } else {
        setLicencas(snap.docs.map((d) => ({ id: d.id, ...d.data(), vencimento: toDate(d.data().vencimento), status: statusFromDate(toDate(d.data().vencimento)) } as LicencaTool)));
        setLoading(false);
      }
    });
  }, []);

  async function handleAdd() {
    const id = `lic_${Date.now()}`;
    const nova: LicencaTool = { id, nome: form.nome, fornecedor: form.fornecedor, tipo: form.tipo as LicencaTool["tipo"], valor: Number(form.valor), vencimento: new Date(form.vencimento), status: statusFromDate(new Date(form.vencimento)), observacao: form.observacao };
    await setDoc(doc(db, "licencas", id), { ...nova });
    setLicencas((prev) => [...prev, nova]);
    setShowForm(false);
    setForm({ nome: "", fornecedor: "", tipo: "anual", valor: "0", vencimento: "", observacao: "" });
  }

  const sorted = [...licencas].sort((a, b) => {
    const order = ["vencida", "vencendo", "ativa"];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Licenças</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-brand text-black font-bold px-4 py-2 rounded-xl text-sm">
          <Plus size={16}/> Adicionar
        </button>
      </div>

      <div className="space-y-3">
        {sorted.map((l) => {
          const { label, color, icon: Icon } = STATUS_CONFIG[l.status];
          return (
            <div key={l.id} className="bg-surface-card border border-surface-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Key size={20} className="text-brand shrink-0" />
                  <div>
                    <p className="text-white font-medium">{l.nome}</p>
                    <p className="text-xs text-slate-400">{l.fornecedor} · {l.tipo} · {l.valor > 0 ? `R$${l.valor}` : "Gratuito"}</p>
                    {l.observacao && <p className="text-xs text-slate-500 mt-0.5">{l.observacao}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 mb-1 ${color}`}>
                    <Icon size={12}/> {label}
                  </span>
                  <p className="text-xs text-slate-400">
                    {l.vencimento.getFullYear() > 2090 ? "Sem vencimento" : formatDistanceToNow(l.vencimento, { locale: ptBR, addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Nova Licença</h3>
            {[
              { label: "Nome da ferramenta", key: "nome", type: "text" },
              { label: "Fornecedor", key: "fornecedor", type: "text" },
              { label: "Valor mensal/anual (R$)", key: "valor", type: "number" },
              { label: "Vencimento", key: "vencimento", type: "date" },
              { label: "Observação", key: "observacao", type: "text" },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                <input type={type} value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand"/>
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-surface-border rounded-xl py-3 text-sm text-slate-300">Cancelar</button>
              <button onClick={handleAdd} disabled={!form.nome || !form.vencimento} className="flex-1 bg-brand text-black font-bold py-3 rounded-xl disabled:opacity-60">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

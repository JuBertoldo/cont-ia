"use client";

import { useEffect, useState } from "react";
import {
  collection, getDocs, doc, updateDoc, setDoc, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlanoEmpresa, Plano, PlanoStatus } from "@/types";
import { DollarSign, AlertTriangle, CheckCircle, Clock, Ban, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const PLANO_VALOR: Record<Plano, number> = {
  starter: 197,
  business: 497,
  enterprise: 997,
};

const STATUS_CONFIG: Record<PlanoStatus, { label: string; color: string; icon: React.ElementType }> = {
  ativo: { label: "Ativo", color: "text-brand bg-brand/10 border-brand/30", icon: CheckCircle },
  atrasado: { label: "Atrasado", color: "text-yellow-400 bg-yellow-900/20 border-yellow-800", icon: Clock },
  inadimplente: { label: "Inadimplente", color: "text-red-400 bg-red-900/20 border-red-800", icon: AlertTriangle },
  cancelado: { label: "Cancelado", color: "text-slate-400 bg-slate-800/30 border-slate-700", icon: Ban },
};

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string);
}

export default function FinanceiroPage() {
  const [planos, setPlanos] = useState<PlanoEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<PlanoEmpresa | null>(null);
  const [novoStatus, setNovoStatus] = useState<PlanoStatus>("ativo");
  const [novoPlano, setNovoPlano] = useState<Plano>("starter");
  const [novoVenc, setNovoVenc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [empSnap, planoSnap] = await Promise.all([
        getDocs(collection(db, "empresas")),
        getDocs(collection(db, "planos")),
      ]);
      const planosMap: Record<string, PlanoEmpresa> = {};
      planoSnap.docs.forEach((d) => {
        const data = d.data();
        planosMap[d.id] = {
          empresaId: d.id,
          empresaNome: "",
          plano: data.plano ?? "starter",
          valor: data.valor ?? PLANO_VALOR[data.plano as Plano] ?? 197,
          vencimento: toDate(data.vencimento) ?? new Date(),
          status: data.status ?? "ativo",
          historico: data.historico ?? [],
          ultimoPagamento: toDate(data.ultimoPagamento),
          diasAtraso: data.diasAtraso,
        };
      });
      const result: PlanoEmpresa[] = empSnap.docs.map((d) => {
        const nome = d.data().nome as string ?? d.id;
        if (planosMap[d.id]) return { ...planosMap[d.id], empresaNome: nome };
        const venc = new Date(); venc.setMonth(venc.getMonth() + 1);
        return {
          empresaId: d.id, empresaNome: nome, plano: "starter",
          valor: 197, vencimento: venc, status: "ativo", historico: [],
        };
      });
      result.sort((a, b) => {
        const order: PlanoStatus[] = ["inadimplente", "atrasado", "ativo", "cancelado"];
        return order.indexOf(a.status) - order.indexOf(b.status);
      });
      setPlanos(result);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!editando) return;
    setSaving(true);
    await setDoc(doc(db, "planos", editando.empresaId), {
      plano: novoPlano,
      valor: PLANO_VALOR[novoPlano],
      vencimento: novoVenc.trim() ? new Date(`${novoVenc}T00:00:00`) : editando.vencimento,
      status: novoStatus,
      historico: editando.historico,
    }, { merge: true });

    // bloquear empresa se inadimplente
    if (novoStatus === "inadimplente" || novoStatus === "cancelado") {
      await updateDoc(doc(db, "empresas", editando.empresaId), {
        bloqueada: true,
        motivoBloqueio: novoStatus === "inadimplente" ? "Inadimplência" : "Cancelamento",
      });
    } else {
      await updateDoc(doc(db, "empresas", editando.empresaId), { bloqueada: false, motivoBloqueio: null });
    }
    setEditando(null);
    setSaving(false);
    setPlanos((prev) => prev.map((p) =>
      p.empresaId === editando.empresaId
        ? { ...p, plano: novoPlano, status: novoStatus, valor: PLANO_VALOR[novoPlano], vencimento: novoVenc ? new Date(novoVenc) : p.vencimento }
        : p
    ));
  }

  const receita = planos.filter((p) => p.status === "ativo").reduce((s, p) => s + p.valor, 0);
  const inadimplentes = planos.filter((p) => p.status === "inadimplente").length;
  const atrasados = planos.filter((p) => p.status === "atrasado").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Financeiro</h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
          <p className="text-slate-400 text-sm mb-1">Receita mensal (ativos)</p>
          <p className="text-3xl font-bold text-brand">R$ {receita.toLocaleString("pt-BR")}</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
          <p className="text-slate-400 text-sm mb-1">Inadimplentes</p>
          <p className={`text-3xl font-bold ${inadimplentes > 0 ? "text-red-400" : "text-white"}`}>{inadimplentes}</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
          <p className="text-slate-400 text-sm mb-1">Com atraso</p>
          <p className={`text-3xl font-bold ${atrasados > 0 ? "text-yellow-400" : "text-white"}`}>{atrasados}</p>
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border">
              {["Empresa", "Plano", "Valor", "Vencimento", "Status", ""].map((h) => (
                <th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planos.map((p) => {
              const { label, color, icon: Icon } = STATUS_CONFIG[p.status];
              const vencendo = p.status === "ativo" && p.vencimento.getTime() - Date.now() < 7 * 86400_000;
              return (
                <tr key={p.empresaId} className="border-b border-surface-border hover:bg-surface/50">
                  <td className="px-4 py-3 text-sm text-white font-medium">{p.empresaNome}</td>
                  <td className="px-4 py-3 text-sm text-slate-300 capitalize">{p.plano}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">R$ {p.valor}</td>
                  <td className={`px-4 py-3 text-sm ${vencendo ? "text-yellow-400" : "text-slate-300"}`}>
                    {p.vencimento.toLocaleDateString("pt-BR")}
                    {vencendo && <span className="ml-1 text-xs">(vencendo!)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border w-fit ${color}`}>
                      <Icon size={12} /> {label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setEditando(p); setNovoStatus(p.status); setNovoPlano(p.plano); setNovoVenc(""); }}
                      className="text-xs text-brand hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editando && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md p-6 space-y-5">
            <h3 className="text-lg font-bold text-white">{editando.empresaNome}</h3>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Plano</label>
              <div className="relative">
                <select value={novoPlano} onChange={(e) => setNovoPlano(e.target.value as Plano)}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand appearance-none">
                  <option value="starter">Starter — R$197/mês</option>
                  <option value="business">Business — R$497/mês</option>
                  <option value="enterprise">Enterprise — R$997/mês</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Novo vencimento</label>
              <input type="date" value={novoVenc} onChange={(e) => setNovoVenc(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Status</label>
              <div className="relative">
                <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value as PlanoStatus)}
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand appearance-none">
                  {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>
              {(novoStatus === "inadimplente" || novoStatus === "cancelado") && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> A empresa será bloqueada automaticamente.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditando(null)} className="flex-1 border border-surface-border rounded-xl py-3 text-sm text-slate-300">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-brand text-black font-bold py-3 rounded-xl disabled:opacity-60">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

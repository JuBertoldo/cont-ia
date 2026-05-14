"use client";

import { useEffect, useState } from "react";
import {
  collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import type { Chamado, TicketStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Ticket, Clock, AlertTriangle, CheckCircle, Search, ChevronDown } from "lucide-react";

const STATUS_LABEL: Record<TicketStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguard. cliente",
  resolvido: "Resolvido",
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  aberto: "text-red-400 bg-red-900/20 border-red-800",
  em_andamento: "text-yellow-400 bg-yellow-900/20 border-yellow-800",
  aguardando_cliente: "text-blue-400 bg-blue-900/20 border-blue-800",
  resolvido: "text-brand bg-brand/10 border-brand/30",
};

const PRIORITY_COLOR: Record<string, string> = {
  Alta: "text-red-400",
  Média: "text-yellow-400",
  Baixa: "text-slate-400",
};

function slaColor(deadline?: Date) {
  if (!deadline) return "text-slate-400";
  const diff = deadline.getTime() - Date.now();
  if (diff < 0) return "text-red-500";
  if (diff < 3_600_000) return "text-red-400";
  if (diff < 7_200_000) return "text-yellow-400";
  return "text-brand";
}

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string);
}

function toChamado(id: string, data: Record<string, unknown>): Chamado {
  return {
    id,
    numero: data.numero as string ?? "",
    titulo: data.titulo as string ?? "",
    descricao: data.descricao as string ?? "",
    tipo: data.tipo as Chamado["tipo"] ?? "outro",
    status: data.status as TicketStatus ?? "aberto",
    prioridade: data.prioridade as Chamado["prioridade"] ?? "Baixa",
    empresaId: data.empresaId as string ?? "",
    empresaNome: data.empresaNome as string,
    adminId: data.adminId as string ?? "",
    adminNome: data.adminNome as string,
    resposta: data.resposta as string,
    respondidoPor: data.respondidoPor as string,
    slaRespostaSuporteAt: toDate(data.slaRespostaSuporteAt),
    slaResolucaoAt: toDate(data.slaResolucaoAt),
    primeiraRespostaAt: toDate(data.primeiraRespostaAt),
    resolvidoAt: toDate(data.resolvidoAt),
    reaberturas: data.reaberturas as number ?? 0,
    createdAt: toDate(data.createdAt) ?? new Date(),
  };
}

export default function ChamadosPage() {
  const { user } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [filtered, setFiltered] = useState<Chamado[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "todos">("todos");
  const [selected, setSelected] = useState<Chamado | null>(null);
  const [resposta, setResposta] = useState("");
  const [novoStatus, setNovoStatus] = useState<TicketStatus>("em_andamento");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "chamados"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => toChamado(d.id, d.data() as Record<string, unknown>));
      setChamados(list);
    });
  }, []);

  useEffect(() => {
    let result = chamados;
    if (statusFilter !== "todos") result = result.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.numero?.toLowerCase().includes(q) ||
               c.titulo?.toLowerCase().includes(q) ||
               c.empresaNome?.toLowerCase().includes(q) ||
               c.adminNome?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [chamados, statusFilter, search]);

  async function handleResponder() {
    if (!selected || !resposta.trim()) return;
    setSaving(true);
    await updateDoc(doc(db, "chamados", selected.id), {
      resposta,
      status: novoStatus,
      respondidoPor: user?.nome,
      primeiraRespostaAt: selected.primeiraRespostaAt ?? serverTimestamp(),
      ...(novoStatus === "resolvido" ? { resolvidoAt: serverTimestamp() } : {}),
    });
    setSelected(null);
    setResposta("");
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Chamados</h2>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} chamado(s)</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, empresa, solicitante..."
            className="w-full bg-surface-card border border-surface-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "todos")}
          className="bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand"
        >
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-slate-500 py-12">Nenhum chamado encontrado.</p>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelected(c); setResposta(c.resposta ?? ""); setNovoStatus(c.status); }}
            className="w-full text-left bg-surface-card border border-surface-border rounded-xl p-4 hover:border-brand/50 transition"
          >
            <div className="flex items-start gap-3">
              <Ticket size={18} className="text-brand mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-slate-400">{c.numero}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                  <span className={`text-xs font-medium ${PRIORITY_COLOR[c.prioridade]}`}>
                    {c.prioridade}
                  </span>
                </div>
                <p className="text-white text-sm font-medium mt-1 truncate">{c.titulo}</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {c.empresaNome} · {c.adminNome} · {formatDistanceToNow(c.createdAt, { locale: ptBR, addSuffix: true })}
                </p>
              </div>
              {c.slaResolucaoAt && (
                <div className={`flex items-center gap-1 text-xs shrink-0 ${slaColor(c.slaResolucaoAt)}`}>
                  <Clock size={12} />
                  {formatDistanceToNow(c.slaResolucaoAt, { locale: ptBR, addSuffix: true })}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Modal de resposta */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-surface-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-slate-400">{selected.numero}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[selected.status]}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{selected.titulo}</h3>
              <p className="text-sm text-slate-400 mt-1">{selected.empresaNome} · {selected.adminNome}</p>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs text-slate-500 mb-1">Descrição</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{selected.descricao}</p>
              </div>

              {selected.slaResolucaoAt && (
                <div className={`flex items-center gap-2 text-sm ${slaColor(selected.slaResolucaoAt)}`}>
                  {Date.now() > selected.slaResolucaoAt.getTime()
                    ? <AlertTriangle size={16} />
                    : <CheckCircle size={16} />}
                  SLA resolução: {selected.slaResolucaoAt.toLocaleString("pt-BR")}
                </div>
              )}

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Resposta / Solução</label>
                <textarea
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  rows={5}
                  placeholder="Descreva a solução ou resposta para o cliente..."
                  className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Alterar status para</label>
                <div className="relative">
                  <select
                    value={novoStatus}
                    onChange={(e) => setNovoStatus(e.target.value as TicketStatus)}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand appearance-none"
                  >
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 border border-surface-border rounded-xl py-3 text-sm text-slate-300 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResponder}
                  disabled={saving || !resposta.trim()}
                  className="flex-2 bg-brand text-black font-bold px-6 py-3 rounded-xl hover:bg-brand-dark transition disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar resposta"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

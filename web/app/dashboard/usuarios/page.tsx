"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Usuario } from "@/types";
import { Search, CheckCircle, XCircle } from "lucide-react";

const ROLE_LABEL: Record<string, string> = { user: "Usuário", admin: "Admin", super_admin: "Super Admin", support: "Suporte" };
const STATUS_COLOR: Record<string, string> = { active: "text-brand", pending: "text-yellow-400", rejected: "text-red-400" };

function toDate(v: unknown): Date { if (v instanceof Timestamp) return v.toDate(); if (v instanceof Date) return v; return new Date(v as string ?? 0); }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, "usuarios")).then((snap) => {
      setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) } as Usuario)));
      setLoading(false);
    });
  }, []);

  async function updateStatus(id: string, status: "active" | "rejected") {
    await updateDoc(doc(db, "usuarios", id), { status });
    setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, status } : u));
  }

  const filtered = usuarios.filter((u) =>
    !search || u.nome?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full"/></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Usuários <span className="text-slate-500 text-lg font-normal">({usuarios.length})</span></h2>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..."
          className="w-full bg-surface-card border border-surface-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand"/>
      </div>
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-surface-border">{["Nome","E-mail","Role","Status","Empresa","Criado em",""].map(h=><th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-surface-border hover:bg-surface/50">
                <td className="px-4 py-3 text-sm text-white">{u.nome}</td>
                <td className="px-4 py-3 text-sm text-slate-400 truncate max-w-[160px]">{u.email}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{ROLE_LABEL[u.role] ?? u.role}</td>
                <td className={`px-4 py-3 text-sm capitalize font-medium ${STATUS_COLOR[u.status] ?? "text-slate-400"}`}>{u.status}</td>
                <td className="px-4 py-3 text-sm text-slate-400 truncate max-w-[100px]">{u.empresaId}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{u.createdAt?.toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3">
                  {u.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(u.id, "active")} className="flex items-center gap-1 text-xs text-brand border border-brand/30 px-2 py-1 rounded-lg hover:bg-brand/10">
                        <CheckCircle size={12}/> Aprovar
                      </button>
                      <button onClick={() => updateStatus(u.id, "rejected")} className="flex items-center gap-1 text-xs text-red-400 border border-red-800 px-2 py-1 rounded-lg hover:bg-red-900/20">
                        <XCircle size={12}/> Recusar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Empresa } from "@/types";
import { Ban, CheckCircle, Search } from "lucide-react";

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string ?? 0);
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, "empresas")).then((snap) => {
      setEmpresas(snap.docs.map((d) => ({
        id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt),
      } as Empresa)));
      setLoading(false);
    });
  }, []);

  async function toggleBloqueio(emp: Empresa) {
    const bloqueada = !emp.bloqueada;
    await updateDoc(doc(db, "empresas", emp.id), {
      bloqueada,
      motivoBloqueio: bloqueada ? "Bloqueio manual" : null,
    });
    setEmpresas((prev) => prev.map((e) => e.id === emp.id ? { ...e, bloqueada } : e));
  }

  const filtered = empresas.filter(
    (e) => !search || e.nome.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">
        Empresas <span className="text-slate-500 text-lg font-normal">({empresas.length})</span>
      </h2>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar empresa..."
          className="w-full bg-surface-card border border-surface-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand"
        />
      </div>

      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border">
              {["Nome", "Código", "Criada em", "Status", ""].map((h) => (
                <th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-surface-border hover:bg-surface/50">
                <td className="px-4 py-3 text-sm text-white font-medium">{e.nome}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-400">{e.codigo}</td>
                <td className="px-4 py-3 text-sm text-slate-400">
                  {e.createdAt?.toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  {e.bloqueada
                    ? <span className="text-xs text-red-400 bg-red-900/20 border border-red-800 px-2 py-0.5 rounded-full">Bloqueada</span>
                    : <span className="text-xs text-brand bg-brand/10 border border-brand/30 px-2 py-0.5 rounded-full">Ativa</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleBloqueio(e)}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition
                      ${e.bloqueada
                        ? "border-brand/30 text-brand hover:bg-brand/10"
                        : "border-red-800 text-red-400 hover:bg-red-900/20"}`}
                  >
                    {e.bloqueada
                      ? <><CheckCircle size={12} /> Desbloquear</>
                      : <><Ban size={12} /> Bloquear</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

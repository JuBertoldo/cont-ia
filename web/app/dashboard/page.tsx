"use client";

import { useEffect, useState } from "react";
import {
  collection, getDocs, query, where, orderBy, limit, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Building2, Users, ScanLine, Ticket, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";

interface Stats {
  empresas: number;
  usuarios: number;
  scans: number;
  chamadosAbertos: number;
  scansHoje: number;
  topDeteccoes: { label: string; count: number }[];
}

function StatCard({ icon: Icon, label, value, sub, color = "brand" }: {
  icon: React.ElementType; label: string; value: number | string;
  sub?: string; color?: string;
}) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl bg-${color === "brand" ? "brand" : "red-500"}/10`}>
          <Icon size={20} className={color === "brand" ? "text-brand" : "text-red-400"} />
        </div>
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    empresas: 0, usuarios: 0, scans: 0, chamadosAbertos: 0,
    scansHoje: 0, topDeteccoes: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [empSnap, usrSnap, scanSnap, ticketSnap] = await Promise.all([
        getDocs(collection(db, "empresas")),
        getDocs(collection(db, "usuarios")),
        getDocs(query(collection(db, "inventario"), orderBy("createdAt", "desc"), limit(500))),
        getDocs(query(collection(db, "chamados"), where("status", "in", ["aberto", "em_andamento"]))),
      ]);

      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      let scansHoje = 0;
      const labelCount: Record<string, number> = {};

      scanSnap.docs.forEach((d) => {
        const data = d.data();
        const ts: Date = data.createdAt instanceof Timestamp
          ? data.createdAt.toDate() : new Date(data.createdAt ?? 0);
        if (ts >= hoje) scansHoje++;
        (data.itens ?? []).forEach((item: { label: string; quantidade: number }) => {
          labelCount[item.label] = (labelCount[item.label] ?? 0) + (item.quantidade ?? 1);
        });
      });

      const topDeteccoes = Object.entries(labelCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, count]) => ({ label, count }));

      setStats({
        empresas: empSnap.size,
        usuarios: usrSnap.size,
        scans: scanSnap.size,
        chamadosAbertos: ticketSnap.size,
        scansHoje,
        topDeteccoes,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Visão Geral</h2>
        <p className="text-slate-400 text-sm mt-1">
          Olá, {user?.nome} — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={Building2} label="Empresas" value={stats.empresas} />
        <StatCard icon={Users} label="Usuários" value={stats.usuarios} />
        <StatCard icon={ScanLine} label="Scans totais" value={stats.scans} sub={`${stats.scansHoje} hoje`} />
        <StatCard icon={Ticket} label="Chamados abertos" value={stats.chamadosAbertos}
          color={stats.chamadosAbertos > 5 ? "red" : "brand"} />
        <StatCard icon={TrendingUp} label="Scans hoje" value={stats.scansHoje} />
      </div>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={20} className="text-brand" />
          <h3 className="text-white font-semibold">Objetos Mais Detectados</h3>
          <span className="ml-auto text-xs text-slate-500">últimos 500 scans</span>
        </div>
        {stats.topDeteccoes.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Nenhuma detecção ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.topDeteccoes} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" stroke="#444" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis type="category" dataKey="label" stroke="#444" tick={{ fill: "#94a3b8", fontSize: 12 }} width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {stats.topDeteccoes.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#00E676" : i < 3 ? "#69F0AE" : "#2a4a3a"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {stats.topDeteccoes.some((d) => d.count > 50) && (
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-800 rounded-lg px-3 py-2">
            <AlertTriangle size={14} />
            Objetos com alta frequência — priorize no dataset para melhorar a precisão.
          </div>
        )}
      </div>
    </div>
  );
}

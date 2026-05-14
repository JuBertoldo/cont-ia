"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { InferenceMetric } from "@/types";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Cpu, AlertTriangle, CheckCircle } from "lucide-react";

function toDate(v: unknown): Date { if (v instanceof Timestamp) return v.toDate(); if (v instanceof Date) return v; return new Date(v as string ?? 0); }

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<InferenceMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "inference_metrics"), orderBy("createdAt", "desc"), limit(200))).then((snap) => {
      setMetrics(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) } as InferenceMetric)).reverse());
      setLoading(false);
    });
  }, []);

  const avgMs = metrics.length ? Math.round(metrics.reduce((s, m) => s + m.inferenceMs, 0) / metrics.length) : 0;
  const p95 = metrics.length ? metrics.map(m=>m.inferenceMs).sort((a,b)=>a-b)[Math.floor(metrics.length * 0.95)] : 0;
  const errorRate = metrics.length ? metrics.filter(m=>!m.success).length / metrics.length : 0;

  const chartData = metrics.slice(-50).map((m) => ({
    time: m.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    ms: m.inferenceMs,
  }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full"/></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Métricas de Inferência</h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
          <p className="text-slate-400 text-sm mb-1 flex items-center gap-2"><Cpu size={14}/> Latência média</p>
          <p className={`text-3xl font-bold ${avgMs > 20000 ? "text-red-400" : avgMs > 10000 ? "text-yellow-400" : "text-brand"}`}>{(avgMs/1000).toFixed(1)}s</p>
          <p className="text-xs text-slate-500 mt-1">SLA: &lt;20s ok / &gt;55s crítico</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
          <p className="text-slate-400 text-sm mb-1">P95</p>
          <p className="text-3xl font-bold text-white">{(p95/1000).toFixed(1)}s</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
          <p className="text-slate-400 text-sm mb-1 flex items-center gap-2">
            {errorRate > 0.05 ? <AlertTriangle size={14} className="text-red-400"/> : <CheckCircle size={14} className="text-brand"/>}
            Taxa de erro
          </p>
          <p className={`text-3xl font-bold ${errorRate > 0.05 ? "text-red-400" : "text-white"}`}>{(errorRate*100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Latência — últimas 50 requisições</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3"/>
            <XAxis dataKey="time" stroke="#444" tick={{ fill: "#94a3b8", fontSize: 11 }}/>
            <YAxis stroke="#444" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}s`}/>
            <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }} formatter={(v: number) => [`${(v/1000).toFixed(2)}s`, "Latência"]}/>
            <Line type="monotone" dataKey="ms" stroke="#00E676" strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

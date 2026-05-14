"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DetectionStat } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from "recharts";
import { BarChart3, AlertTriangle, TrendingDown } from "lucide-react";

export default function DeteccoesPage() {
  const [stats, setStats] = useState<DetectionStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(
        query(collection(db, "inventario"), orderBy("createdAt", "desc"), limit(1000))
      );
      const labelMap: Record<string, { count: number; totalConf: number; corrections: number }> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        const detections = data.detections ?? [];
        const correcoes: string[] = (data.correcoes ?? []).map((c: { labelOriginal: string }) => c.labelOriginal);
        detections.forEach((det: { label: string; confidence: number }) => {
          if (!labelMap[det.label]) labelMap[det.label] = { count: 0, totalConf: 0, corrections: 0 };
          labelMap[det.label].count++;
          labelMap[det.label].totalConf += det.confidence ?? 0;
          if (correcoes.includes(det.label)) labelMap[det.label].corrections++;
        });
      });
      const result: DetectionStat[] = Object.entries(labelMap)
        .map(([label, { count, totalConf, corrections }]) => ({
          label,
          count,
          avgConfidence: count > 0 ? totalConf / count : 0,
          correctionRate: count > 0 ? corrections / count : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      setStats(result);
      setLoading(false);
    }
    load();
  }, []);

  const top10 = stats.slice(0, 10);
  const lowConf = [...stats].filter((s) => s.avgConfidence < 0.6).sort((a, b) => a.avgConfidence - b.avgConfidence).slice(0, 8);
  const highCorr = [...stats].filter((s) => s.correctionRate > 0.1).sort((a, b) => b.correctionRate - a.correctionRate).slice(0, 8);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full"/></div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Inteligência de Detecções</h2>
        <p className="text-slate-400 text-sm mt-1">Análise dos últimos 1.000 scans para otimização do dataset</p>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={20} className="text-brand"/>
          <h3 className="text-white font-semibold">Top 10 Objetos Mais Detectados</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top10} layout="vertical">
            <XAxis type="number" stroke="#444" tick={{ fill: "#94a3b8", fontSize: 12 }}/>
            <YAxis type="category" dataKey="label" stroke="#444" tick={{ fill: "#94a3b8", fontSize: 12 }} width={110}/>
            <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8 }} labelStyle={{ color: "#fff" }}/>
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {top10.map((_, i) => <Cell key={i} fill={i === 0 ? "#00E676" : i < 3 ? "#69F0AE" : "#2a4a3a"}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={18} className="text-yellow-400"/>
            <h3 className="text-white font-semibold text-sm">Baixa Confiança</h3>
            <span className="text-xs text-slate-500 ml-auto">Priorizar no dataset</span>
          </div>
          {lowConf.length === 0 ? <p className="text-slate-500 text-sm text-center py-4">Todos com boa confiança ✓</p> : (
            <div className="space-y-2">
              {lowConf.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300 truncate">{s.label}</span>
                  <span className={`text-xs font-mono ${s.avgConfidence < 0.4 ? "text-red-400" : "text-yellow-400"}`}>
                    {Math.round(s.avgConfidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-400"/>
            <h3 className="text-white font-semibold text-sm">Mais Corrigidos</h3>
            <span className="text-xs text-slate-500 ml-auto">Ponto cego do modelo</span>
          </div>
          {highCorr.length === 0 ? <p className="text-slate-500 text-sm text-center py-4">Sem correções frequentes ✓</p> : (
            <div className="space-y-2">
              {highCorr.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300 truncate">{s.label}</span>
                  <span className="text-xs font-mono text-red-400">{Math.round(s.correctionRate * 100)}% corrigido</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(lowConf.length > 0 || highCorr.length > 0) && (
        <div className="bg-amber-900/20 border border-amber-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5"/>
          <div>
            <p className="text-amber-300 text-sm font-medium">Recomendação para o dataset</p>
            <p className="text-amber-400/80 text-xs mt-1">
              {lowConf.length > 0 && `Colete mais fotos de: ${lowConf.slice(0,3).map(s=>s.label).join(", ")}. `}
              {highCorr.length > 0 && `Revise labels de: ${highCorr.slice(0,3).map(s=>s.label).join(", ")}.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

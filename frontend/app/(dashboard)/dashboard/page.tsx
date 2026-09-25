"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api } from "@/lib/api";

interface Summary {
  totalTrades: number;
  totalPnl: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
  expectancy: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  equityCurve: { date: string; equity: number }[];
}

interface Monthly {
  month: string;
  pnl: number;
  trades: number;
  winRate: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<Monthly[]>([]);

  useEffect(() => {
    api.get("/analytics/summary").then((r) => setSummary(r.data));
    api.get("/analytics/monthly").then((r) => setMonthly(r.data));
  }, []);

  if (!summary) {
    return <div className="p-8 text-slate-400">Loading...</div>;
  }

  const cards = [
    {
      label: "Total P&L",
      value: `$${summary.totalPnl.toFixed(2)}`,
      color: summary.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400",
    },
    { label: "Win Rate", value: `${summary.winRate.toFixed(1)}%` },
    { label: "Trades", value: summary.totalTrades },
    {
      label: "Profit Factor",
      value:
        summary.profitFactor == null || !isFinite(summary.profitFactor)
          ? "∞"
          : summary.profitFactor.toFixed(2),
    },
    { label: "Avg Win", value: `$${summary.avgWin.toFixed(2)}`, color: "text-emerald-400" },
    { label: "Avg Loss", value: `-$${summary.avgLoss.toFixed(2)}`, color: "text-rose-400" },
    { label: "Expectancy", value: `$${summary.expectancy.toFixed(2)}` },
    { label: "Max DD", value: `${summary.maxDrawdownPct.toFixed(2)}%`, color: "text-amber-400" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Your trading performance at a glance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">{c.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${c.color || "text-white"}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-4">Equity Curve</h2>
        {summary.equityCurve.length === 0 ? (
          <p className="text-slate-500 text-sm py-12 text-center">
            No closed trades yet
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={summary.equityCurve}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                }
              />
              <YAxis stroke="#64748b" />
              <Tooltip
  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
  formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "P&L"]}
/>
              <Line
                type="monotone"
                dataKey="equity"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-4">Monthly P&L</h2>
        {monthly.length === 0 ? (
          <p className="text-slate-500 text-sm py-12 text-center">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: 8,
                }}
                formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "P&L"]}
              />
              <Bar dataKey="pnl" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
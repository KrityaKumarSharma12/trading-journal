"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

interface Trade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: string;
  entryPrice: string;
  exitPrice: string | null;
  entryTime: string;
  exitTime: string | null;
  realizedPnl: string | null;
  rMultiple: string | null;
}

interface StrategyDetail {
  id: string;
  name: string;
  description: string | null;
  rules: string | null;
  trades: Trade[];
  stats: {
    trades: number;
    pnl: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    expectancy: number;
  };
}

export default function StrategyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);

  useEffect(() => {
    api.get(`/strategies/${id}`).then((r) => setStrategy(r.data));
  }, [id]);

  if (!strategy) return <div className="p-8 text-slate-400">Loading...</div>;

  const { stats } = strategy;
  const cards = [
    {
      label: "Total P&L",
      value: `$${stats.pnl.toFixed(2)}`,
      color: stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400",
    },
    { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%` },
    { label: "Trades", value: stats.trades },
    {
      label: "Profit Factor",
      value: stats.profitFactor >= 999 ? "∞" : stats.profitFactor.toFixed(2),
    },
    { label: "Avg Win", value: `$${stats.avgWin.toFixed(2)}`, color: "text-emerald-400" },
    { label: "Avg Loss", value: `-$${stats.avgLoss.toFixed(2)}`, color: "text-rose-400" },
    { label: "Expectancy", value: `$${stats.expectancy.toFixed(2)}` },
  ];

  return (
    <div className="p-8 space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <h1 className="text-3xl font-semibold text-white">{strategy.name}</h1>
        {strategy.description && (
          <p className="text-slate-400 mt-1">{strategy.description}</p>
        )}
      </div>

      {strategy.rules && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm text-slate-400 mb-2">Rules</h3>
          <p className="text-slate-200 whitespace-pre-wrap text-sm">{strategy.rules}</p>
        </div>
      )}

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

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-medium text-white">Trades</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400">
            <tr>
              <th className="text-left px-4 py-3">Symbol</th>
              <th className="text-left px-4 py-3">Side</th>
              <th className="text-right px-4 py-3">Entry</th>
              <th className="text-right px-4 py-3">Exit</th>
              <th className="text-right px-4 py-3">P&L</th>
              <th className="text-right px-4 py-3">R</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {strategy.trades.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  No trades tagged with this strategy yet
                </td>
              </tr>
            ) : (
              strategy.trades.map((t) => {
                const pnl = t.realizedPnl ? Number(t.realizedPnl) : null;
                return (
                  <tr key={t.id} className="border-t border-slate-800">
                    <td className="px-4 py-3 font-medium text-white">{t.symbol}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          t.side === "BUY"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      ${Number(t.entryPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.exitPrice ? `$${Number(t.exitPrice).toFixed(2)}` : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        pnl == null
                          ? "text-slate-400"
                          : pnl >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {pnl == null ? "—" : `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {t.rMultiple ? `${Number(t.rMultiple)}R` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(t.entryTime).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
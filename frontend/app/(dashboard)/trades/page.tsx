"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Trade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  status: "OPEN" | "CLOSED";
  quantity: string;
  entryPrice: string;
  exitPrice: string | null;
  entryTime: string;
  exitTime: string | null;
  realizedPnl: string | null;
  rMultiple: string | null;
  tags: string[];
  strategy: { name: string } | null;
}

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    symbol: "",
    side: "",
    status: "",
    tag: "",
  });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    const res = await api.get(`/trades?${params.toString()}`);
    setTrades(res.data.items);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Trades</h1>
          <p className="text-slate-400 mt-1">{trades.length} trades shown</p>
        </div>
        <Link
          href="/trades/new"
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + New Trade
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-3">
        <input
          placeholder="Symbol"
          value={filters.symbol}
          onChange={(e) => setFilters({ ...filters, symbol: e.target.value.toUpperCase() })}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={filters.side}
          onChange={(e) => setFilters({ ...filters, side: e.target.value })}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All sides</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
        <input
          placeholder="Tag"
          value={filters.tag}
          onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={load}
          className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm"
        >
          Apply
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400">
            <tr>
              <th className="text-left px-4 py-3">Symbol</th>
              <th className="text-left px-4 py-3">Side</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Qty</th>
              <th className="text-right px-4 py-3">Entry</th>
              <th className="text-right px-4 py-3">Exit</th>
              <th className="text-right px-4 py-3">P&L</th>
              <th className="text-right px-4 py-3">R</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : trades.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-500">
                  No trades yet.{" "}
                  <Link href="/trades/new" className="text-emerald-400 hover:underline">
                    Add your first
                  </Link>
                </td>
              </tr>
            ) : (
              trades.map((t) => {
                const pnl = t.realizedPnl ? Number(t.realizedPnl) : null;
                return (
                  <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-800/30">
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
                    <td className="px-4 py-3 text-slate-400">{t.status}</td>
                    <td className="px-4 py-3 text-right">{Number(t.quantity)}</td>
                    <td className="px-4 py-3 text-right">${Number(t.entryPrice).toFixed(2)}</td>
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
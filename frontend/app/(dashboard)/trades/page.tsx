"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Filter, X, Calendar, DollarSign, Target, Tag } from "lucide-react";
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
  strategy: { id: string; name: string } | null;
}

interface Strategy {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
];

export default function TradesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read filters from URL on mount
  const [filters, setFilters] = useState({
    symbol: searchParams.get("symbol") || "",
    side: searchParams.get("side") || "",
    status: searchParams.get("status") || "",
    tag: searchParams.get("tag") || "",
    strategyId: searchParams.get("strategyId") || "",
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
    minPnl: searchParams.get("minPnl") || "",
    maxPnl: searchParams.get("maxPnl") || "",
  });

  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync filters to URL whenever they change
  const updateFilters = useCallback(
    (next: typeof filters) => {
      setFilters(next);
      const params = new URLSearchParams();
      Object.entries(next).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router]
  );

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    params.set("limit", "200");
    const res = await api.get(`/trades?${params.toString()}`);
    setTrades(res.data.items);
    setLoading(false);
  }

  useEffect(() => {
    api.get("/strategies").then((r) => setStrategies(r.data));
  }, []);

  // Reload when URL changes (e.g. back button)
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  function clearFilters() {
    updateFilters({
      symbol: "",
      side: "",
      status: "",
      tag: "",
      strategyId: "",
      from: "",
      to: "",
      minPnl: "",
      maxPnl: "",
    });
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const input =
    "bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Trades</h1>
          <p className="text-slate-400 mt-1">
            {loading ? "Loading..." : `${trades.length} trades shown`}
          </p>
        </div>
        <Link
          href="/trades/new"
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + New Trade
        </Link>
      </div>

      {/* Filter bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        {/* Row 1 — basic filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            placeholder="Symbol"
            value={filters.symbol}
            onChange={(e) =>
              updateFilters({ ...filters, symbol: e.target.value.toUpperCase() })
            }
            className={`${input} w-32`}
          />

          <select
            value={filters.side}
            onChange={(e) => updateFilters({ ...filters, side: e.target.value })}
            className={`${input} w-32`}
          >
            <option value="">All sides</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) =>
              updateFilters({ ...filters, status: e.target.value })
            }
            className={`${input} w-32`}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={filters.strategyId}
            onChange={(e) =>
              updateFilters({ ...filters, strategyId: e.target.value })
            }
            className={`${input} w-44`}
          >
            <option value="">All strategies</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Tag"
            value={filters.tag}
            onChange={(e) => updateFilters({ ...filters, tag: e.target.value })}
            className={`${input} w-32`}
          />

          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
              showAdvanced
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            }`}
          >
            <Filter className="w-4 h-4" />
            Advanced
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white ml-auto"
            >
              <X className="w-4 h-4" /> Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Row 2 — advanced filters */}
        {showAdvanced && (
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date range */}
            <div>
              <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <Calendar className="w-3 h-3" /> Date Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) =>
                    updateFilters({ ...filters, from: e.target.value })
                  }
                  className={`${input} flex-1`}
                  placeholder="From"
                />
                <span className="text-slate-500 text-sm">to</span>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) =>
                    updateFilters({ ...filters, to: e.target.value })
                  }
                  className={`${input} flex-1`}
                  placeholder="To"
                />
              </div>
            </div>

            {/* P&L range */}
            <div>
              <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <DollarSign className="w-3 h-3" /> P&L Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPnl}
                  onChange={(e) =>
                    updateFilters({ ...filters, minPnl: e.target.value })
                  }
                  className={`${input} flex-1`}
                />
                <span className="text-slate-500 text-sm">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPnl}
                  onChange={(e) =>
                    updateFilters({ ...filters, maxPnl: e.target.value })
                  }
                  className={`${input} flex-1`}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trades table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400">
            <tr>
              <th className="text-left px-4 py-3">Symbol</th>
              <th className="text-left px-4 py-3">Side</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Strategy</th>
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
                <td colSpan={10} className="text-center py-12 text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : trades.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-500">
                  No trades match your filters.{" "}
                  {activeFilterCount > 0 ? (
                    <button
                      onClick={clearFilters}
                      className="text-emerald-400 hover:underline"
                    >
                      Clear filters
                    </button>
                  ) : (
                    <Link
                      href="/trades/new"
                      className="text-emerald-400 hover:underline"
                    >
                      Add your first
                    </Link>
                  )}
                </td>
              </tr>
            ) : (
              trades.map((t) => {
                const pnl = t.realizedPnl ? Number(t.realizedPnl) : null;
                return (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/trades/${t.id}`)}
                    className="border-t border-slate-800 hover:bg-slate-800/30 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {t.symbol}
                    </td>
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
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {t.strategy?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {Number(t.quantity)}
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
                      {pnl == null
                        ? "—"
                        : `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
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
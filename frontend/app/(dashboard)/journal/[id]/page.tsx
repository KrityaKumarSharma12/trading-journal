"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Save, X, Plus } from "lucide-react";
import { api } from "@/lib/api";

interface TradeSummary {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: string;
  entryPrice: string;
  exitPrice: string | null;
  entryTime: string;
  realizedPnl: string | null;
  rMultiple: string | null;
}

interface JournalEntry {
  id: string;
  date: string;
  title: string | null;
  content: string;
  mood: string | null;
  tradeIds: string[];
  trades: TradeSummary[];
  createdAt: string;
}

interface TradeOption {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  entryTime: string;
  realizedPnl: string | null;
}

const MOODS = [
  { value: "", label: "—", emoji: "" },
  { value: "great", label: "Great", emoji: "😄" },
  { value: "good", label: "Good", emoji: "🙂" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "bad", label: "Bad", emoji: "😕" },
  { value: "terrible", label: "Terrible", emoji: "😞" },
];

export default function JournalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [allTrades, setAllTrades] = useState<TradeOption[]>([]);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);

  async function load() {
    const [entryRes, tradesRes] = await Promise.all([
      api.get(`/journal/${id}`),
      api.get(`/trades?limit=200`),
    ]);
    setEntry(entryRes.data);
    setForm(fromEntry(entryRes.data));
    setAllTrades(tradesRes.data.items);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function fromEntry(e: JournalEntry) {
    return {
      date: toLocalInput(e.date),
      title: e.title ?? "",
      mood: e.mood ?? "",
      content: e.content,
      tradeIds: e.tradeIds,
    };
  }

  function toLocalInput(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  }

  async function onSave() {
    setSaving(true);
    setErr("");
    try {
      await api.put(`/journal/${id}`, {
        date: new Date(form.date).toISOString(),
        title: form.title || null,
        mood: form.mood || null,
        content: form.content,
        tradeIds: form.tradeIds,
      });
      await load();
      setEditing(false);
    } catch (e: any) {
      setErr(e.response?.data?.error?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete this journal entry?")) return;
    await api.delete(`/journal/${id}`);
    router.push("/journal");
  }

  function cancelEdit() {
    if (entry) setForm(fromEntry(entry));
    setEditing(false);
    setErr("");
  }

  function toggleTradeLink(tradeId: string) {
    const current = new Set<string>(form.tradeIds);
    if (current.has(tradeId)) current.delete(tradeId);
    else current.add(tradeId);
    setForm({ ...form, tradeIds: Array.from(current) });
  }

  if (!entry) return <div className="p-8 text-slate-400">Loading...</div>;

  const input =
    "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500";
  const label = "block text-sm text-slate-400 mb-1";

  const currentMood = MOODS.find((m) => m.value === entry.mood);

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/journal")}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to journal
        </button>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={onDelete}
                className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 rounded-lg text-sm"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {err && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3">
          {err}
        </div>
      )}

      {editing ? (
        /* EDIT */
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Date</label>
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Mood</label>
              <select
                value={form.mood}
                onChange={(e) => setForm({ ...form, mood: e.target.value })}
                className={input}
              >
                {MOODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.emoji} {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Content</label>
            <textarea
              rows={8}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className={input}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">
                Linked Trades ({form.tradeIds.length})
              </label>
              <button
                type="button"
                onClick={() => setLinkPickerOpen((v) => !v)}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add trades
              </button>
            </div>

            {linkPickerOpen && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg max-h-64 overflow-y-auto mb-3">
                {allTrades.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No trades yet</p>
                ) : (
                  allTrades.map((t) => {
                    const linked = form.tradeIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTradeLink(t.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-800 transition ${
                          linked ? "bg-emerald-500/10" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {t.symbol}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              t.side === "BUY"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {t.side}
                          </span>
                          <span className="text-slate-500 text-xs">
                            {new Date(t.entryTime).toLocaleDateString()}
                          </span>
                        </span>
                        {linked && (
                          <span className="text-emerald-400 text-xs">
                            ✓ Linked
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW */
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-slate-400 text-sm">
                {new Date(entry.date).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {currentMood && currentMood.emoji && (
                <span className="text-2xl">{currentMood.emoji}</span>
              )}
            </div>
            {entry.title && (
              <h1 className="text-2xl font-semibold text-white mb-4">
                {entry.title}
              </h1>
            )}
            <p className="text-slate-200 whitespace-pre-wrap">
              {entry.content}
            </p>
          </div>

          {entry.trades.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-lg font-medium text-white">
                  Linked Trades ({entry.trades.length})
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-2">Symbol</th>
                    <th className="text-left px-4 py-2">Side</th>
                    <th className="text-right px-4 py-2">Entry</th>
                    <th className="text-right px-4 py-2">P&L</th>
                    <th className="text-right px-4 py-2">R</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.trades.map((t) => {
                    const pnl = t.realizedPnl ? Number(t.realizedPnl) : null;
                    return (
                      <tr key={t.id} className="border-t border-slate-800">
                        <td className="px-4 py-2">
                          <Link
                            href={`/trades/${t.id}`}
                            className="text-white font-medium hover:text-emerald-400"
                          >
                            {t.symbol}
                          </Link>
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              t.side === "BUY"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {t.side}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-slate-400">
                          ${Number(t.entryPrice).toFixed(2)}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-medium ${
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
                        <td className="px-4 py-2 text-right text-slate-400">
                          {t.rMultiple ? `${Number(t.rMultiple)}R` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
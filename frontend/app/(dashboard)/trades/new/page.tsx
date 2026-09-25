"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function NewTradePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    symbol: "",
    side: "BUY",
    strategyId: "",
    quantity: "",
    entryPrice: "",
    exitPrice: "",
    entryTime: new Date().toISOString().slice(0, 16),
    exitTime: "",
    fees: "0",
    stopLoss: "",
    takeProfit: "",
    tags: "",
    notes: "",
  });
  const [strategies, setStrategies] = useState<{ id: string; name: string }[]>([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/strategies").then((r) => setStrategies(r.data));
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const payload: any = {
        symbol: form.symbol,
        side: form.side,
        quantity: Number(form.quantity),
        entryPrice: Number(form.entryPrice),
        entryTime: new Date(form.entryTime).toISOString(),
        fees: Number(form.fees || 0),
        tags: form.tags
          ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
      };
      if (form.strategyId) payload.strategyId = form.strategyId;
      if (form.exitPrice) {
        payload.exitPrice = Number(form.exitPrice);
        payload.exitTime = form.exitTime
          ? new Date(form.exitTime).toISOString()
          : new Date().toISOString();
      }
      if (form.stopLoss) payload.stopLoss = Number(form.stopLoss);
      if (form.takeProfit) payload.takeProfit = Number(form.takeProfit);
      if (form.notes) payload.notes = form.notes;

      await api.post("/trades", payload);
      router.push("/trades");
    } catch (e: any) {
      setErr(e.response?.data?.error?.message || "Failed to save trade");
    } finally {
      setSaving(false);
    }
  }

  const input =
    "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500";
  const label = "block text-sm text-slate-400 mb-1";

  return (
    <form onSubmit={onSubmit} className="p-8 max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold text-white">New Trade</h1>

      {err && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={label}>Symbol</label>
          <input
            required
            value={form.symbol}
            onChange={(e) => set("symbol", e.target.value.toUpperCase())}
            className={input}
            placeholder="AAPL"
          />
        </div>
        <div>
          <label className={label}>Side</label>
          <select
            value={form.side}
            onChange={(e) => set("side", e.target.value)}
            className={input}
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>
        <div>
          <label className={label}>Strategy (optional)</label>
          <select
            value={form.strategyId}
            onChange={(e) => set("strategyId", e.target.value)}
            className={input}
          >
            <option value="">— None —</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Quantity</label>
          <input
            required
            type="number"
            step="any"
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
            className={input}
            placeholder="10"
          />
        </div>
        <div>
          <label className={label}>Entry Price</label>
          <input
            required
            type="number"
            step="any"
            value={form.entryPrice}
            onChange={(e) => set("entryPrice", e.target.value)}
            className={input}
            placeholder="180.00"
          />
        </div>
        <div>
          <label className={label}>Entry Time</label>
          <input
            required
            type="datetime-local"
            value={form.entryTime}
            onChange={(e) => set("entryTime", e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Exit Price (optional)</label>
          <input
            type="number"
            step="any"
            value={form.exitPrice}
            onChange={(e) => set("exitPrice", e.target.value)}
            className={input}
            placeholder="185.00"
          />
        </div>
        <div>
          <label className={label}>Exit Time (optional)</label>
          <input
            type="datetime-local"
            value={form.exitTime}
            onChange={(e) => set("exitTime", e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Fees</label>
          <input
            type="number"
            step="any"
            value={form.fees}
            onChange={(e) => set("fees", e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Stop Loss (optional)</label>
          <input
            type="number"
            step="any"
            value={form.stopLoss}
            onChange={(e) => set("stopLoss", e.target.value)}
            className={input}
            placeholder="178.00"
          />
        </div>
        <div>
          <label className={label}>Take Profit (optional)</label>
          <input
            type="number"
            step="any"
            value={form.takeProfit}
            onChange={(e) => set("takeProfit", e.target.value)}
            className={input}
            placeholder="190.00"
          />
        </div>
      </div>

      <div>
        <label className={label}>Tags (comma separated)</label>
        <input
          value={form.tags}
          onChange={(e) => set("tags", e.target.value)}
          className={input}
          placeholder="breakout, A+ setup"
        />
      </div>

      <div>
        <label className={label}>Notes</label>
        <textarea
          rows={4}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={input}
          placeholder="What was your thesis? How did you feel?"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-6 py-2 rounded-lg font-medium transition"
        >
          {saving ? "Saving..." : "Save Trade"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-lg font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
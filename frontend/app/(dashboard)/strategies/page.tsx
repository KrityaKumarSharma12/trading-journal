"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Target, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  rules: string | null;
  createdAt: string;
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", rules: "" });
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    const res = await api.get("/strategies");
    setStrategies(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/strategies", form);
      setForm({ name: "", description: "", rules: "" });
      setCreating(false);
      load();
    } catch (e: any) {
      setErr(e.response?.data?.error || "Failed to create");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this strategy? Trades tagged with it will be untagged.")) return;
    await api.delete(`/strategies/${id}`);
    load();
  }

  const input =
    "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Strategies</h1>
          <p className="text-slate-400 mt-1">
            Define your setups and track how each performs
          </p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Strategy
        </button>
      </div>

      {creating && (
        <form
          onSubmit={onCreate}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-lg font-medium text-white">Create Strategy</h2>
          {err && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
          <input
            required
            placeholder="Name (e.g. Opening Range Breakout)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={input}
          />
          <input
            placeholder="Short description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={input}
          />
          <textarea
            rows={3}
            placeholder="Rules (optional) — e.g. Enter on 5min break of ORH, stop at ORL"
            value={form.rules}
            onChange={(e) => setForm({ ...form, rules: e.target.value })}
            className={input}
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : strategies.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Target className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">
            No strategies yet. Create one to start tagging trades.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((s) => (
            <div
              key={s.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/strategies/${s.id}`}
                  className="font-medium text-white hover:text-emerald-400 flex-1"
                >
                  {s.name}
                </Link>
                <button
                  onClick={() => onDelete(s.id)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {s.description && (
                <p className="text-sm text-slate-400 line-clamp-2">{s.description}</p>
              )}
              {s.rules && (
                <p className="text-xs text-slate-500 line-clamp-3 border-t border-slate-800 pt-3">
                  {s.rules}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
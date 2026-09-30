"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Link2,
  Trash2,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "@/lib/api";

interface BrokerConnection {
  id: string;
  broker: string;
  apiKey: string;
  label: string | null;
  lastSyncAt: string | null;
  createdAt: string;
}

interface SyncResult {
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  totalFetched: number;
  errors: { id: number; reason: string }[];
}

function maskKey(key: string) {
  if (key.length <= 12) return key;
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function BrokersPage() {
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    apiKey: "",
    apiSecret: "",
    label: "",
  });
  const [showSecret, setShowSecret] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [err, setErr] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncErr, setSyncErr] = useState("");

  async function load() {
    setLoading(true);
    const res = await api.get("/brokers");
    setConnections(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setErr("");
    try {
      await api.post("/brokers/delta/connect", {
        apiKey: form.apiKey.trim(),
        apiSecret: form.apiSecret.trim(),
        label: form.label.trim() || null,
      });
      setForm({ apiKey: "", apiSecret: "", label: "" });
      setShowForm(false);
      load();
    } catch (e: any) {
      setErr(
        e.response?.data?.error?.message ||
          e.response?.data?.error ||
          "Failed to connect"
      );
    } finally {
      setConnecting(false);
    }
  }

  async function onSync(id: string) {
    setSyncingId(id);
    setSyncResult(null);
    setSyncErr("");
    try {
      const res = await api.post(`/brokers/${id}/sync`);
      setSyncResult(res.data);
      load();
    } catch (e: any) {
      setSyncErr(
        e.response?.data?.error || "Sync failed. Check your API keys."
      );
    } finally {
      setSyncingId(null);
    }
  }

  async function onDisconnect(id: string) {
    if (
      !confirm(
        "Disconnect this broker?\n\nYour imported trades will remain, but no new trades will sync."
      )
    )
      return;
    await api.delete(`/brokers/${id}`);
    load();
  }

  const input =
    "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500";
  const label = "block text-sm text-slate-400 mb-1";

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Brokers</h1>
          <p className="text-slate-400 mt-1">
            Connect your exchange account to sync trades automatically
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Connect Delta Exchange
          </button>
        )}
      </div>

      {/* Connect form */}
      {showForm && (
        <form
          onSubmit={onConnect}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-medium text-white">
              Connect Delta Exchange India
            </h2>
          </div>

          <div className="text-sm text-slate-400 space-y-1 bg-slate-950/50 border border-slate-800 rounded-lg p-3">
            <p>
              Generate API keys at: Delta Exchange →{" "}
              <span className="text-slate-200">Account → API Management</span>
            </p>
            <p>
              Required permission:{" "}
              <span className="text-emerald-400 font-medium">Read Data</span>{" "}
              only
            </p>
          </div>

          {err && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <div>
            <label className={label}>API Key</label>
            <input
              required
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              className={input}
              placeholder="dk_live_..."
              autoComplete="off"
            />
          </div>

          <div>
            <label className={label}>API Secret</label>
            <div className="relative">
              <input
                required
                type={showSecret ? "text" : "password"}
                value={form.apiSecret}
                onChange={(e) =>
                  setForm({ ...form, apiSecret: e.target.value })
                }
                className={`${input} pr-10`}
                placeholder="Your API secret"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showSecret ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className={label}>Label (optional)</label>
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className={input}
              placeholder="e.g. Main account"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={connecting}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              {connecting ? "Verifying..." : "Connect"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setErr("");
                setForm({ apiKey: "", apiSecret: "", label: "" });
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-300 font-medium">
            <Check className="w-5 h-5" />
            Sync complete
          </div>
          <div className="text-sm text-slate-300 space-y-0.5">
            <p>
              ✅ Imported{" "}
              <span className="text-emerald-400 font-semibold">
                {syncResult.imported}
              </span>{" "}
              new trade{syncResult.imported === 1 ? "" : "s"}
            </p>
            <p className="text-slate-400">
              Fetched {syncResult.totalFetched} total
              {syncResult.skippedDuplicates > 0 &&
                ` • ${syncResult.skippedDuplicates} already imported`}
              {syncResult.skippedInvalid > 0 &&
                ` • ${syncResult.skippedInvalid} invalid`}
            </p>
          </div>
          {syncResult.errors.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-amber-400">
                View {syncResult.errors.length} skipped rows
              </summary>
              <ul className="mt-2 space-y-0.5 text-amber-300/80 font-mono text-xs">
                {syncResult.errors.map((e, i) => (
                  <li key={i}>
                    Fill {e.id}: {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setSyncResult(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Sync error */}
      {syncErr && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 flex items-start gap-2">
          <X className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{syncErr}</span>
        </div>
      )}

      {/* Connections list */}
      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : connections.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Link2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">
            No brokers connected yet. Link Delta Exchange India to sync trades
            automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">
                    {c.label || "Delta Exchange India"}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {c.broker}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  Key: {maskKey(c.apiKey)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Last sync: {timeAgo(c.lastSyncAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSync(c.id)}
                  disabled={syncingId === c.id}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      syncingId === c.id ? "animate-spin" : ""
                    }`}
                  />
                  {syncingId === c.id ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  onClick={() => onDisconnect(c.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Disconnect"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";

interface JournalEntry {
  id: string;
  date: string;
  title: string | null;
  content: string;
  mood: string | null;
  tradeIds: string[];
  createdAt: string;
}

const MOODS = [
  { value: "", label: "—", emoji: "" },
  { value: "great", label: "Great", emoji: "😄" },
  { value: "good", label: "Good", emoji: "🙂" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "bad", label: "Bad", emoji: "😕" },
  { value: "terrible", label: "Terrible", emoji: "😞" },
];

function moodEmoji(value: string | null) {
  return MOODS.find((m) => m.value === value)?.emoji || "";
}

export default function JournalPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 16),
    title: "",
    mood: "",
    content: "",
  });
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await api.get(`/journal?${params.toString()}`);
    setEntries(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.post("/journal", {
        date: new Date(form.date).toISOString(),
        title: form.title || null,
        mood: form.mood || null,
        content: form.content,
        tradeIds: [],
      });
      router.push(`/journal/${res.data.id}`);
    } catch (e: any) {
      setErr(e.response?.data?.error?.message || "Failed to create");
    }
  }

  const input =
    "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500";

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Journal</h1>
          <p className="text-slate-400 mt-1">
            Reflect on your trades and track your mindset
          </p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          placeholder="Search entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Create form */}
      {creating && (
        <form
          onSubmit={onCreate}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-lg font-medium text-white">New Journal Entry</h2>

          {err && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Date</label>
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={input}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Mood</label>
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
            <label className="block text-sm text-slate-400 mb-1">
              Title (optional)
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={input}
              placeholder="e.g. Followed my plan perfectly today"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              className={input}
              placeholder="What did you learn today? How did you feel about your trades?"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              Create Entry
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Entries list */}
      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">
            No journal entries yet. Start reflecting on your trades.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/journal/${entry.id}`}
              className="block bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-slate-400 text-sm">
                      {new Date(entry.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {entry.mood && (
                      <span className="text-lg">{moodEmoji(entry.mood)}</span>
                    )}
                    {entry.tradeIds.length > 0 && (
                      <span className="text-xs text-slate-500">
                        {entry.tradeIds.length} trade
                        {entry.tradeIds.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  {entry.title && (
                    <h3 className="text-white font-medium truncate">
                      {entry.title}
                    </h3>
                  )}
                  <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                    {entry.content}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
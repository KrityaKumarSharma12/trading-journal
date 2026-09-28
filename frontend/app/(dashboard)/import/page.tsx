"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Check, AlertCircle, Download, X } from "lucide-react";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Fields our backend accepts, with labels and required flags
const FIELDS = [
  { key: "symbol", label: "Symbol", required: true },
  { key: "side", label: "Side (BUY / SELL)", required: true },
  { key: "quantity", label: "Quantity", required: true },
  { key: "entryPrice", label: "Entry Price", required: true },
  { key: "entryTime", label: "Entry Time", required: true },
  { key: "exitPrice", label: "Exit Price", required: false },
  { key: "exitTime", label: "Exit Time", required: false },
  { key: "fees", label: "Fees", required: false },
  { key: "stopLoss", label: "Stop Loss", required: false },
  { key: "takeProfit", label: "Take Profit", required: false },
  { key: "tags", label: "Tags", required: false },
  { key: "notes", label: "Notes", required: false },
];

interface PreviewResponse {
  headers: string[];
  totalRows: number;
  sampleRows: Record<string, string>[];
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [err, setErr] = useState("");

  // Debug — confirm axios baseURL
  useEffect(() => {
    console.log("[import] API_URL from env:", API_URL);
    console.log("[import] api.defaults.baseURL:", api.defaults.baseURL);
  }, []);

  // Auto-guess a mapping when we first see the headers
  useEffect(() => {
    if (!preview) return;
    const lower = preview.headers.map((h) => h.toLowerCase());
    const guess: Record<string, string> = {};

    const guessMap: Record<string, string[]> = {
      symbol: ["symbol", "ticker", "instrument"],
      side: ["side", "action", "direction", "type"],
      quantity: ["quantity", "qty", "shares", "size", "amount"],
      entryPrice: ["entryprice", "entry_price", "entry price", "open", "buy price"],
      exitPrice: ["exitprice", "exit_price", "exit price", "close", "sell price"],
      entryTime: ["entrytime", "entry_time", "entry time", "opened", "open time"],
      exitTime: ["exittime", "exit_time", "exit time", "closed", "close time"],
      fees: ["fees", "commission", "cost"],
      stopLoss: ["stoploss", "stop_loss", "stop", "sl"],
      takeProfit: ["takeprofit", "take_profit", "target", "tp"],
      tags: ["tags", "labels", "notes_tags"],
      notes: ["notes", "comment", "memo"],
    };

    for (const [field, candidates] of Object.entries(guessMap)) {
      const idx = lower.findIndex((h) =>
        candidates.some((c) => h === c || h.includes(c))
      );
      if (idx >= 0) guess[field] = preview.headers[idx];
    }

    setMapping(guess);
  }, [preview]);

  function onFileSelect(f: File) {
    setFile(f);
    setPreview(null);
    setMapping({});
    setResult(null);
    setErr("");
  }

  async function onUpload() {
    if (!file) return;
    setParsing(true);
    setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      // ⚠️ DO NOT set Content-Type manually — axios must set it with the multipart boundary
      const res = await api.post<PreviewResponse>("/import/preview", form);
      setPreview(res.data);
    } catch (e: any) {
      console.error("Upload error:", e);
      const status = e.response?.status;
      const backendErr = e.response?.data?.error;
      const networkMsg = e.message;
      setErr(
        `Failed to parse file (${status ?? "no status"}): ${
          backendErr || networkMsg || "unknown error"
        }`
      );
    } finally {
      setParsing(false);
    }
  }

  async function onImport() {
    if (!file || !preview) return;

    const missing = FIELDS.filter((f) => f.required && !mapping[f.key]).map(
      (f) => f.label
    );
    if (missing.length > 0) {
      setErr(`Please map required fields: ${missing.join(", ")}`);
      return;
    }

    setImporting(true);
    setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mapping", JSON.stringify(mapping));
      // ⚠️ DO NOT set Content-Type manually
      const res = await api.post<ImportResult>("/import/csv", form);
      setResult(res.data);
    } catch (e: any) {
      console.error("Import error:", e);
      const status = e.response?.status;
      const backendErr = e.response?.data?.error;
      const networkMsg = e.message;
      setErr(
        `Import failed (${status ?? "no status"}): ${
          backendErr || networkMsg || "unknown error"
        }`
      );
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setMapping({});
    setResult(null);
    setErr("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Import Trades</h1>
          <p className="text-slate-400 mt-1">
            Upload a CSV from your broker — we'll handle the rest
          </p>
        </div>
        <a
          href={`${API_URL}/import/template`}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm"
        >
          <Download className="w-4 h-4" /> Download Template
        </a>
      </div>

      {err && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="break-all">{err}</span>
        </div>
      )}

      {result && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-emerald-400" />
            <div>
              <p className="text-emerald-300 font-medium">
                Imported {result.imported} trade
                {result.imported === 1 ? "" : "s"}
              </p>
              {result.skipped > 0 && (
                <p className="text-amber-400 text-sm">
                  Skipped {result.skipped} row
                  {result.skipped === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </div>

          {result.errors.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-200">
                View skipped rows ({result.errors.length})
              </summary>
              <ul className="mt-2 space-y-1 text-amber-300/80 font-mono text-xs">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/trades")}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              View Trades
            </button>
            <button
              onClick={reset}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm"
            >
              Import Another
            </button>
          </div>
        </div>
      )}

      {!preview && !result && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onFileSelect(f);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-12 text-center cursor-pointer transition"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileSelect(f);
            }}
          />
          <Upload className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Drop your CSV file here</p>
          <p className="text-slate-500 text-sm mt-1">
            or click to browse — supports any broker export
          </p>

          {file && !parsing && (
            <div className="mt-6 inline-flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 text-sm text-slate-300">
              <FileText className="w-4 h-4" />
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="text-slate-500 hover:text-rose-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {file && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpload();
              }}
              disabled={parsing}
              className="mt-4 block mx-auto bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-6 py-2 rounded-lg text-sm font-medium"
            >
              {parsing ? "Parsing..." : "Continue"}
            </button>
          )}
        </div>
      )}

      {preview && !result && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-white">Map Columns</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Found {preview.totalRows} rows and {preview.headers.length}{" "}
                  columns. Map them to our fields below.
                </p>
              </div>
              <button
                onClick={reset}
                className="text-slate-400 hover:text-white text-sm"
              >
                Start over
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm text-slate-400 mb-1">
                    {f.label}
                    {f.required && (
                      <span className="text-rose-400 ml-1">*</span>
                    )}
                  </label>
                  <select
                    value={mapping[f.key] || ""}
                    onChange={(e) =>
                      setMapping({ ...mapping, [f.key]: e.target.value })
                    }
                    className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-slate-100 focus:outline-none ${
                      f.required && !mapping[f.key]
                        ? "border-rose-500/50 focus:border-rose-500"
                        : "border-slate-700 focus:border-emerald-500"
                    }`}
                  >
                    <option value="">— Not mapped —</option>
                    {preview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-lg font-medium text-white">
                Preview (first {preview.sampleRows.length} rows)
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Values shown as they'll be interpreted after mapping
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-800/50 text-slate-400">
                  <tr>
                    {FIELDS.filter((f) => mapping[f.key]).map((f) => (
                      <th
                        key={f.key}
                        className="text-left px-3 py-2 whitespace-nowrap"
                      >
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sampleRows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      {FIELDS.filter((f) => mapping[f.key]).map((f) => (
                        <td
                          key={f.key}
                          className="px-3 py-2 text-slate-300 whitespace-nowrap"
                        >
                          {row[mapping[f.key]] || (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onImport}
              disabled={importing}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg font-medium"
            >
              {importing
                ? "Importing..."
                : `Import ${preview.totalRows} Trades`}
            </button>
            <button
              onClick={reset}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-2.5 rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
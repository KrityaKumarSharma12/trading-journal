import { Router } from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { computeRealizedPnl, computeRMultiple } from "../services/pnl.service";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.use(requireAuth);

/**
 * Return a sample CSV users can download and fill in.
 */
router.get("/template", (_req, res) => {
  const headers = [
    "symbol",
    "side",
    "quantity",
    "entryPrice",
    "exitPrice",
    "entryTime",
    "exitTime",
    "fees",
    "stopLoss",
    "takeProfit",
    "tags",
    "notes",
  ];

  const sampleRows = [
    {
      symbol: "AAPL",
      side: "BUY",
      quantity: "10",
      entryPrice: "180.00",
      exitPrice: "185.00",
      entryTime: "2025-01-10T14:30:00.000Z",
      exitTime: "2025-01-10T18:00:00.000Z",
      fees: "2",
      stopLoss: "178.00",
      takeProfit: "190.00",
      tags: "breakout;A+ setup",
      notes: "Strong volume at entry",
    },
    {
      symbol: "TSLA",
      side: "SELL",
      quantity: "5",
      entryPrice: "250.00",
      exitPrice: "245.00",
      entryTime: "2025-01-11T14:30:00.000Z",
      exitTime: "2025-01-11T16:00:00.000Z",
      fees: "1",
      stopLoss: "253.00",
      takeProfit: "240.00",
      tags: "short;reversal",
      notes: "Failed breakout",
    },
  ];

  const rows = [headers.join(",")];
  for (const r of sampleRows) {
    rows.push(headers.map((h) => (r as any)[h] ?? "").join(","));
  }

  const csv = rows.join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="trades-template.csv"'
  );
  res.send(csv);
});

/**
 * Parse a CSV and return the rows + detected headers, without inserting.
 * Body: multipart/form-data with `file`.
 */
router.post("/preview", upload.single("file"), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const rows: any[] = [];

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(req.file!.path)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve())
      .on("error", reject);
  });

  fs.unlinkSync(req.file.path);

  if (rows.length === 0) {
    return res.status(400).json({
      error:
        "CSV file is empty or not in CSV format. Make sure the file has a header row and comma-separated values.",
    });
  }

  const headers = Object.keys(rows[0]);

  // Basic sanity check
  const hasHeaderLikeColumn = headers.some((h) =>
    /symbol|ticker|side|action|quantity|qty|price|date|time/i.test(h)
  );

  if (!hasHeaderLikeColumn) {
    return res.status(400).json({
      error:
        "File doesn't look like a trades CSV. Expected columns like symbol, side, quantity, entryPrice, entryTime.",
      detectedHeaders: headers,
    });
  }

  res.json({
    headers,
    totalRows: rows.length,
    sampleRows: rows.slice(0, 10),
  });
});

/**
 * Import trades with a column mapping.
 * Body: multipart/form-data with `file` + `mapping` (JSON string).
 */
router.post(
  "/csv",
  upload.single("file"),
  async (req: AuthRequest, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    let mapping: Record<string, string>;
    try {
      mapping = JSON.parse(req.body.mapping || "{}");
    } catch {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Invalid mapping JSON" });
    }

    const required = ["symbol", "side", "quantity", "entryPrice", "entryTime"];
    const missing = required.filter((f) => !mapping[f]);
    if (missing.length > 0) {
      fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ error: `Missing mapping for: ${missing.join(", ")}` });
    }

    const rows: any[] = [];
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(req.file!.path)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", () => resolve())
        .on("error", reject);
    });
    fs.unlinkSync(req.file.path);

    function pick(row: any, field: string): any {
      const header = mapping[field];
      if (!header) return undefined;
      return row[header];
    }

    function parseSide(raw: any): "BUY" | "SELL" | null {
      if (raw == null) return null;
      const s = String(raw).trim().toUpperCase();
      if (["BUY", "B", "LONG", "BOT", "BOUGHT"].includes(s)) return "BUY";
      if (["SELL", "S", "SHORT", "SLD", "SOLD"].includes(s)) return "SELL";
      return null;
    }

    function parseNumber(raw: any): number | null {
      if (raw == null || raw === "") return null;
      const cleaned = String(raw).replace(/[$,]/g, "").trim();
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    }

    function parseDate(raw: any): Date | null {
      if (!raw) return null;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }

    function parseTags(raw: any): string[] {
      if (!raw) return [];
      return String(raw)
        .split(/[;,]/)
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const prepared: any[] = [];
    const errors: { row: number; reason: string }[] = [];

    rows.forEach((row, i) => {
      try {
        const symbol = String(pick(row, "symbol") || "").trim().toUpperCase();
        const side = parseSide(pick(row, "side"));
        const quantity = parseNumber(pick(row, "quantity"));
        const entryPrice = parseNumber(pick(row, "entryPrice"));
        const entryTime = parseDate(pick(row, "entryTime"));

        if (!symbol) throw new Error("Missing symbol");
        if (!side) throw new Error("Invalid side");
        if (quantity == null || quantity <= 0) throw new Error("Invalid quantity");
        if (entryPrice == null || entryPrice <= 0) throw new Error("Invalid entryPrice");
        if (!entryTime) throw new Error("Invalid entryTime");

        const exitPrice = parseNumber(pick(row, "exitPrice"));
        const exitTime = parseDate(pick(row, "exitTime"));
        const fees = parseNumber(pick(row, "fees")) ?? 0;
        const stopLoss = parseNumber(pick(row, "stopLoss"));
        const takeProfit = parseNumber(pick(row, "takeProfit"));
        const tags = parseTags(pick(row, "tags"));
        const notes = pick(row, "notes") ? String(pick(row, "notes")) : null;

        const input = {
          symbol,
          side,
          quantity,
          entryPrice,
          exitPrice,
          fees,
          stopLoss,
          takeProfit,
        };

        const realizedPnl =
          exitPrice != null ? computeRealizedPnl(input as any) : null;
        const rMultiple =
          exitPrice != null ? computeRMultiple(input as any) : null;

        prepared.push({
          symbol,
          side,
          status: exitPrice != null ? "CLOSED" : "OPEN",
          quantity,
          entryPrice,
          exitPrice,
          entryTime,
          exitTime,
          fees,
          stopLoss,
          takeProfit,
          tags,
          notes,
          realizedPnl,
          rMultiple,
        });
      } catch (e: any) {
        errors.push({ row: i + 2, reason: e.message });
      }
    });

    if (prepared.length === 0) {
      return res.status(400).json({
        imported: 0,
        skipped: errors.length,
        errors: errors.slice(0, 20),
        message: "No valid rows to import",
      });
    }

    const created = await prisma.$transaction(
      prepared.map((t) =>
        prisma.trade.create({
          data: {
            userId: req.user!.id,
            ...t,
          },
        })
      )
    );

    res.json({
      imported: created.length,
      skipped: errors.length,
      errors: errors.slice(0, 20),
    });
  }
);

export default router;
import { Router } from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { computeRealizedPnl, computeRMultiple } from "../services/pnl.service";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.use(requireAuth);

router.post("/csv", upload.single("file"), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  const rows: any[] = [];
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(req.file!.path)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve())
      .on("error", reject);
  });
  fs.unlinkSync(req.file.path);

  // Expected headers (case-insensitive):
  // symbol, side, quantity, entryPrice, exitPrice, entryTime, exitTime, fees, tags, notes
  const normalize = (o: any) => {
    const m: any = {};
    for (const k of Object.keys(o)) m[k.toLowerCase().trim()] = o[k];
    return m;
  };

  const prepared = rows
    .map(normalize)
    .map((r) => {
      const side = String(r.side || "").toUpperCase() === "SELL" ? "SELL" : "BUY";
      const exitPrice = r.exitprice ? Number(r.exitprice) : null;
      const input = {
        symbol: String(r.symbol).toUpperCase(),
        side,
        quantity: Number(r.quantity),
        entryPrice: Number(r.entryprice),
        exitPrice,
        entryTime: new Date(r.entrytime),
        exitTime: r.exittime ? new Date(r.exittime) : null,
        fees: Number(r.fees || 0),
        stopLoss: r.stoploss ? Number(r.stoploss) : null,
        takeProfit: r.takeprofit ? Number(r.takeprofit) : null,
        tags: r.tags ? String(r.tags).split(";").map((t) => t.trim()).filter(Boolean) : [],
        notes: r.notes || null,
      };
      const realizedPnl = exitPrice ? computeRealizedPnl(input as any) : null;
      const rMultiple   = exitPrice ? computeRMultiple(input as any)   : null;
      return { ...input, realizedPnl, rMultiple };
    })
    .filter((r) => r.symbol && !Number.isNaN(r.quantity) && !Number.isNaN(r.entryPrice));

  const result = await prisma.$transaction(
    prepared.map((t) =>
      prisma.trade.create({
        data: {
          userId: req.user!.id,
          symbol: t.symbol,
          side: t.side as "BUY" | "SELL",
          status: t.exitPrice ? "CLOSED" : "OPEN",
          quantity: t.quantity,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice,
          entryTime: t.entryTime,
          exitTime: t.exitTime,
          fees: t.fees,
          stopLoss: t.stopLoss,
          takeProfit: t.takeProfit,
          tags: t.tags,
          notes: t.notes,
          realizedPnl: t.realizedPnl,
          rMultiple: t.rMultiple,
        },
      })
    )
  );

  res.json({ imported: result.length });
});

export default router;
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  computeRealizedPnl,
  computeRMultiple,
} from "../services/pnl.service";

const router = Router();
router.use(requireAuth);

const tradeSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive(),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().optional().nullable(),
  entryTime: z.string().datetime(),
  exitTime: z.string().datetime().optional().nullable(),
  fees: z.number().nonnegative().default(0),
  stopLoss: z.number().optional().nullable(),
  takeProfit: z.number().optional().nullable(),
  strategyId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  followedPlan: z.boolean().optional(),
});

// CREATE
router.post("/", async (req: AuthRequest, res) => {
  const parsed = tradeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const d = parsed.data;
  const realizedPnl = d.exitPrice ? computeRealizedPnl(d) : null;
  const rMultiple   = d.exitPrice ? computeRMultiple(d) : null;

  const trade = await prisma.trade.create({
    data: {
      userId: req.user!.id,
      symbol: d.symbol.toUpperCase(),
      side: d.side,
      status: d.exitPrice ? "CLOSED" : "OPEN",
      quantity: d.quantity,
      entryPrice: d.entryPrice,
      exitPrice: d.exitPrice ?? null,
      entryTime: new Date(d.entryTime),
      exitTime: d.exitTime ? new Date(d.exitTime) : null,
      fees: d.fees,
      stopLoss: d.stopLoss ?? null,
      takeProfit: d.takeProfit ?? null,
      strategyId: d.strategyId ?? null,
      accountId: d.accountId ?? null,
      tags: d.tags,
      notes: d.notes ?? null,
      followedPlan: d.followedPlan ?? true,
      realizedPnl: realizedPnl ?? null,
      rMultiple: rMultiple ?? null,
    },
  });

  res.status(201).json(trade);
});

// LIST with advanced filters
router.get("/", async (req: AuthRequest, res) => {
  const {
    symbol, strategyId, side, status, tag,
    from, to, minPnl, maxPnl, sort = "entryTime", order = "desc",
    page = "1", limit = "50",
  } = req.query as Record<string, string>;

  const where: any = { userId: req.user!.id };
  if (symbol)     where.symbol = symbol.toUpperCase();
  if (strategyId) where.strategyId = strategyId;
  if (side)       where.side = side;
  if (status)     where.status = status;
  if (tag)        where.tags = { has: tag };
  if (from || to) where.entryTime = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to   ? { lte: new Date(to)   } : {}),
  };
  if (minPnl || maxPnl) where.realizedPnl = {
    ...(minPnl ? { gte: Number(minPnl) } : {}),
    ...(maxPnl ? { lte: Number(maxPnl) } : {}),
  };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      include: { strategy: true },
      orderBy: { [sort]: order },
      skip,
      take: Number(limit),
    }),
    prisma.trade.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

// GET ONE
router.get("/:id", async (req: AuthRequest, res) => {
  const trade = await prisma.trade.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { strategy: true },
  });
  if (!trade) return res.status(404).json({ error: "Not found" });
  res.json(trade);
});

// UPDATE
router.put("/:id", async (req: AuthRequest, res) => {
  const parsed = tradeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.trade.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const d = parsed.data;
  const merged = { ...existing, ...d };
  const realizedPnl = merged.exitPrice ? computeRealizedPnl(merged as any) : null;
  const rMultiple   = merged.exitPrice ? computeRMultiple(merged as any)   : null;

  const trade = await prisma.trade.update({
    where: { id: req.params.id },
    data: {
      ...d,
      entryTime: d.entryTime ? new Date(d.entryTime) : undefined,
      exitTime:  d.exitTime  ? new Date(d.exitTime)  : undefined,
      status: merged.exitPrice ? "CLOSED" : "OPEN",
      realizedPnl,
      rMultiple,
    },
  });

  res.json(trade);
});

// DELETE
router.delete("/:id", async (req: AuthRequest, res) => {
  const trade = await prisma.trade.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!trade) return res.status(404).json({ error: "Not found" });
  await prisma.trade.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
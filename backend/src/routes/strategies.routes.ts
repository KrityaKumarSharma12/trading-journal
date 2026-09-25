import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const strategySchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().optional().nullable(),
  rules: z.string().optional().nullable(),
});

// LIST
router.get("/", async (req: AuthRequest, res) => {
  const strategies = await prisma.strategy.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "asc" },
  });
  res.json(strategies);
});

// CREATE
router.post("/", async (req: AuthRequest, res) => {
  const parsed = strategySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const d = parsed.data;
  try {
    const strategy = await prisma.strategy.create({
      data: {
        userId: req.user!.id,
        name: d.name,
        description: d.description ?? null,
        rules: d.rules ?? null,
      },
    });
    res.status(201).json(strategy);
  } catch (e: any) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Strategy name already exists" });
    }
    throw e;
  }
});

// GET ONE with stats
router.get("/:id", async (req: AuthRequest, res) => {
  const strategy = await prisma.strategy.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: {
      trades: {
        where: { status: "CLOSED" },
        orderBy: { exitTime: "desc" },
      },
    },
  });
  if (!strategy) return res.status(404).json({ error: "Not found" });

  const pnls = strategy.trades.map((t) => Number(t.realizedPnl ?? 0));
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const grossProfit = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));

  res.json({
    ...strategy,
    stats: {
      trades: pnls.length,
      pnl: pnls.reduce((a, b) => a + b, 0),
      winRate: pnls.length ? (wins.length / pnls.length) * 100 : 0,
      avgWin: wins.length ? grossProfit / wins.length : 0,
      avgLoss: losses.length ? grossLoss / losses.length : 0,
      profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? 999 : 0,
      expectancy: pnls.length ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0,
    },
  });
});

// UPDATE
router.put("/:id", async (req: AuthRequest, res) => {
  const parsed = strategySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.strategy.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.strategy.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(updated);
});

// DELETE
router.delete("/:id", async (req: AuthRequest, res) => {
  const existing = await prisma.strategy.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) return res.status(404).json({ error: "Not found" });

  await prisma.strategy.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
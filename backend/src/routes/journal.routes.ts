import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const journalSchema = z.object({
  date: z.string().datetime(),
  title: z.string().max(120).optional().nullable(),
  content: z.string().min(1, "Content cannot be empty"),
  mood: z.string().max(20).optional().nullable(),
  tradeIds: z.array(z.string()).default([]),
});

// LIST with optional date range
router.get("/", async (req: AuthRequest, res) => {
  const { from, to, search, limit = "100" } = req.query as Record<string, string>;

  const where: any = { userId: req.user!.id };
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  const entries = await prisma.journalEntry.findMany({
    where,
    orderBy: { date: "desc" },
    take: Number(limit),
  });

  res.json(entries);
});

// GET one
router.get("/:id", async (req: AuthRequest, res) => {
  const entry = await prisma.journalEntry.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!entry) return res.status(404).json({ error: "Not found" });

  // Fetch linked trades
  const trades = entry.tradeIds.length
    ? await prisma.trade.findMany({
        where: { id: { in: entry.tradeIds }, userId: req.user!.id },
        select: {
          id: true,
          symbol: true,
          side: true,
          quantity: true,
          entryPrice: true,
          exitPrice: true,
          entryTime: true,
          exitTime: true,
          realizedPnl: true,
          rMultiple: true,
        },
      })
    : [];

  res.json({ ...entry, trades });
});

// CREATE
router.post("/", async (req: AuthRequest, res) => {
  const parsed = journalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const d = parsed.data;

  // Validate tradeIds belong to this user
  if (d.tradeIds.length > 0) {
    const owned = await prisma.trade.findMany({
      where: { id: { in: d.tradeIds }, userId: req.user!.id },
      select: { id: true },
    });
    if (owned.length !== d.tradeIds.length) {
      return res.status(400).json({ error: "Some trades don't belong to you" });
    }
  }

  const entry = await prisma.journalEntry.create({
    data: {
      userId: req.user!.id,
      date: new Date(d.date),
      title: d.title ?? null,
      content: d.content,
      mood: d.mood ?? null,
      tradeIds: d.tradeIds,
    },
  });

  res.status(201).json(entry);
});

// UPDATE
router.put("/:id", async (req: AuthRequest, res) => {
  const parsed = journalSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.journalEntry.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const d = parsed.data;

  if (d.tradeIds && d.tradeIds.length > 0) {
    const owned = await prisma.trade.findMany({
      where: { id: { in: d.tradeIds }, userId: req.user!.id },
      select: { id: true },
    });
    if (owned.length !== d.tradeIds.length) {
      return res.status(400).json({ error: "Some trades don't belong to you" });
    }
  }

  const updated = await prisma.journalEntry.update({
    where: { id: req.params.id },
    data: {
      ...(d.date ? { date: new Date(d.date) } : {}),
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.content !== undefined ? { content: d.content } : {}),
      ...(d.mood !== undefined ? { mood: d.mood } : {}),
      ...(d.tradeIds !== undefined ? { tradeIds: d.tradeIds } : {}),
    },
  });

  res.json(updated);
});

// DELETE
router.delete("/:id", async (req: AuthRequest, res) => {
  const existing = await prisma.journalEntry.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) return res.status(404).json({ error: "Not found" });

  await prisma.journalEntry.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
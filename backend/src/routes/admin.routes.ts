import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

// LIST USERS with counts
router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          trades: true,
          strategies: true,
          journalEntries: true,
        },
      },
    },
  });

  res.json(users);
});

// SYSTEM STATS
router.get("/stats", async (_req, res) => {
  const [users, trades, strategies, journals] = await Promise.all([
    prisma.user.count(),
    prisma.trade.count(),
    prisma.strategy.count(),
    prisma.journalEntry.count(),
  ]);

  res.json({ users, trades, strategies, journals });
});

// UPDATE USER ROLE
router.patch("/users/:id/role", async (req: AuthRequest, res) => {
  const { role } = req.body;
  if (role !== "USER" && role !== "ADMIN") {
    return res.status(400).json({ error: "Role must be USER or ADMIN" });
  }

  // Prevent self-demotion (would lock you out)
  if (req.params.id === req.user!.id && role !== "ADMIN") {
    return res
      .status(400)
      .json({ error: "You cannot demote yourself" });
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, email: true, role: true },
  });

  res.json(user);
});

// DELETE USER (cascades via Prisma schema)
router.delete("/users/:id", async (req: AuthRequest, res) => {
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ error: "You cannot delete yourself" });
  }

  const exists = await prisma.user.findUnique({
    where: { id: req.params.id },
  });
  if (!exists) return res.status(404).json({ error: "User not found" });

  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
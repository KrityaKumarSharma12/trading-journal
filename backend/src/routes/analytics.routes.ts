import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (req: AuthRequest, res) => {
  const trades = await prisma.trade.findMany({
    where: { userId: req.user!.id, status: "CLOSED" },
    orderBy: { exitTime: "asc" },
  });

  const closed = trades.filter((t) => t.realizedPnl !== null);
  const pnls = closed.map((t) => Number(t.realizedPnl));

  const wins   = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);

  const grossProfit = wins.reduce((a, b) => a + b, 0);
  const grossLoss   = Math.abs(losses.reduce((a, b) => a + b, 0));

  const totalPnl     = pnls.reduce((a, b) => a + b, 0);
  const winRate      = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgWin       = wins.length ? grossProfit / wins.length : 0;
  const avgLoss      = losses.length ? grossLoss / losses.length : 0;
  const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0;
  const expectancy   = closed.length ? totalPnl / closed.length : 0;

  // Equity curve + max drawdown
  let equity = 0, peak = 0, maxDD = 0;
  const equityCurve = closed.map((t) => {
    equity += Number(t.realizedPnl);
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, peak - equity);
    return { date: t.exitTime, equity };
  });

  const maxDrawdownPct = peak ? (maxDD / peak) * 100 : 0;

  res.json({
    totalTrades: closed.length,
    totalPnl,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    expectancy,
    grossProfit,
    grossLoss,
    maxDrawdown: maxDD,
    maxDrawdownPct,
    equityCurve,
  });
});

// Monthly breakdown
router.get("/monthly", async (req: AuthRequest, res) => {
  const trades = await prisma.trade.findMany({
    where: { userId: req.user!.id, status: "CLOSED" },
    orderBy: { exitTime: "asc" },
  });

  const byMonth: Record<string, { pnl: number; trades: number; wins: number }> = {};
  for (const t of trades) {
    if (!t.exitTime || t.realizedPnl === null) continue;
    const key = `${t.exitTime.getUTCFullYear()}-${String(t.exitTime.getUTCMonth() + 1).padStart(2, "0")}`;
    byMonth[key] ??= { pnl: 0, trades: 0, wins: 0 };
    byMonth[key].pnl    += Number(t.realizedPnl);
    byMonth[key].trades += 1;
    if (Number(t.realizedPnl) > 0) byMonth[key].wins += 1;
  }

  res.json(
    Object.entries(byMonth).map(([month, v]) => ({
      month,
      pnl: v.pnl,
      trades: v.trades,
      winRate: v.trades ? (v.wins / v.trades) * 100 : 0,
    }))
  );
});

// Daily calendar data
router.get("/calendar", async (req: AuthRequest, res) => {
  const { year, month } = req.query as Record<string, string>;
  const y = Number(year), m = Number(month);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end   = new Date(Date.UTC(y, m, 1));

  const trades = await prisma.trade.findMany({
    where: {
      userId: req.user!.id,
      status: "CLOSED",
      exitTime: { gte: start, lt: end },
    },
  });

  const daily: Record<string, { pnl: number; trades: number }> = {};
  for (const t of trades) {
    if (!t.exitTime || t.realizedPnl === null) continue;
    const key = t.exitTime.toISOString().slice(0, 10);
    daily[key] ??= { pnl: 0, trades: 0 };
    daily[key].pnl    += Number(t.realizedPnl);
    daily[key].trades += 1;
  }

  res.json(daily);
});

// Strategy performance
router.get("/strategies", async (req: AuthRequest, res) => {
  const strategies = await prisma.strategy.findMany({
    where: { userId: req.user!.id },
    include: { trades: { where: { status: "CLOSED" } } },
  });

  res.json(
    strategies.map((s) => {
      const pnls = s.trades.map((t) => Number(t.realizedPnl ?? 0));
      const wins = pnls.filter((p) => p > 0);
      return {
        id: s.id,
        name: s.name,
        trades: pnls.length,
        pnl: pnls.reduce((a, b) => a + b, 0),
        winRate: pnls.length ? (wins.length / pnls.length) * 100 : 0,
      };
    })
  );
});

export default router;
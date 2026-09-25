import { Decimal } from "@prisma/client/runtime/library";

export interface TradeInput {
  side: "BUY" | "SELL";
  quantity: number | string;
  entryPrice: number | string;
  exitPrice?: number | string | null;
  fees?: number | string;
  stopLoss?: number | string | null;
  takeProfit?: number | string | null;
}

/**
 * Realized P&L for a closed trade.
 * Long (BUY):  (exit - entry) * qty - fees
 * Short (SELL): (entry - exit) * qty - fees
 */
export function computeRealizedPnl(t: TradeInput): Decimal | null {
  if (t.exitPrice == null) return null;
  const qty   = new Decimal(t.quantity);
  const entry = new Decimal(t.entryPrice);
  const exit  = new Decimal(t.exitPrice);
  const fees  = new Decimal(t.fees ?? 0);

  const diff = t.side === "BUY" ? exit.minus(entry) : entry.minus(exit);
  return diff.mul(qty).minus(fees);
}

/**
 * Unrealized P&L for an open position given current market price.
 */
export function computeUnrealizedPnl(
  t: TradeInput,
  currentPrice: number | string
): Decimal | null {
  if (t.exitPrice != null) return null;
  const qty   = new Decimal(t.quantity);
  const entry = new Decimal(t.entryPrice);
  const curr  = new Decimal(currentPrice);

  const diff = t.side === "BUY" ? curr.minus(entry) : entry.minus(curr);
  return diff.mul(qty);
}

/**
 * R-Multiple: how many "R" (risk units) the trade returned.
 * R = |entry - stopLoss|. Return = exit - entry (direction aware).
 */
export function computeRMultiple(t: TradeInput): Decimal | null {
  if (t.exitPrice == null || t.stopLoss == null) return null;
  const entry = new Decimal(t.entryPrice);
  const exit  = new Decimal(t.exitPrice);
  const stop  = new Decimal(t.stopLoss);

  const risk = entry.minus(stop).abs();
  if (risk.isZero()) return null;

  const reward = t.side === "BUY" ? exit.minus(entry) : entry.minus(exit);
  return reward.div(risk).toDecimalPlaces(2);
}

/**
 * Risk/Reward ratio from stop + target.
 */
export function computeRiskReward(t: TradeInput): Decimal | null {
  if (t.stopLoss == null || t.takeProfit == null) return null;
  const entry = new Decimal(t.entryPrice);
  const stop  = new Decimal(t.stopLoss);
  const tp    = new Decimal(t.takeProfit);

  const risk   = entry.minus(stop).abs();
  const reward = tp.minus(entry).abs();
  if (risk.isZero()) return null;
  return reward.div(risk).toDecimalPlaces(2);
}
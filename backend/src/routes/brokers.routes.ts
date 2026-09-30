import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { encrypt, decrypt } from "../services/crypto.service";
import { testConnection, fetchAllFills } from "../services/delta.service";

const router = Router();
router.use(requireAuth);

const connectSchema = z.object({
  apiKey: z.string().min(8),
  apiSecret: z.string().min(8),
  label: z.string().max(60).optional().nullable(),
});

/**
 * POST /brokers/delta/connect
 * Save an encrypted Delta connection for this user.
 */
router.post("/delta/connect", async (req: AuthRequest, res) => {
  const parsed = connectSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { apiKey, apiSecret, label } = parsed.data;

  // Verify credentials before storing
  try {
    await testConnection(apiKey, apiSecret);
  } catch (e: any) {
    return res.status(400).json({
      error: "Delta rejected these credentials. " + (e.message || ""),
    });
  }

  const encryptedSecret = encrypt(apiSecret);

  try {
    const connection = await prisma.brokerConnection.create({
      data: {
        userId: req.user!.id,
        broker: "DELTA_INDIA",
        apiKey,
        apiSecret: encryptedSecret,
        label: label ?? null,
      },
      select: {
        id: true,
        broker: true,
        apiKey: true,
        label: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });
    res.status(201).json(connection);
  } catch (e: any) {
    if (e.code === "P2002") {
      return res
        .status(409)
        .json({ error: "This Delta account is already connected" });
    }
    throw e;
  }
});

/**
 * GET /brokers
 * List this user's connections (never returns secrets).
 */
router.get("/", async (req: AuthRequest, res) => {
  const connections = await prisma.brokerConnection.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      broker: true,
      apiKey: true,
      label: true,
      lastSyncAt: true,
      createdAt: true,
    },
  });
  res.json(connections);
});

/**
 * POST /brokers/:id/sync
 *
 * Pull ALL fills from Delta, insert new ones, skip existing.
 *
 * We deliberately fetch everything (no `since` cutoff) because:
 *   1. Delta returns fills newest-first — the first page can include
 *      very old fills, which breaks a simple time-based cutoff.
 *   2. Deduplication by externalId means re-fetching existing fills
 *      is cheap — they're just skipped at insert time.
 */
router.post("/:id/sync", async (req: AuthRequest, res) => {
  const connection = await prisma.brokerConnection.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!connection)
    return res.status(404).json({ error: "Connection not found" });

  if (connection.broker !== "DELTA_INDIA") {
    return res.status(400).json({ error: "Unsupported broker" });
  }

  let apiSecret: string;
  try {
    apiSecret = decrypt(connection.apiSecret);
  } catch {
    return res
      .status(500)
      .json({ error: "Stored secret is unreadable. Reconnect this broker." });
  }

  // Fetch all fills. No `since` — dedup handles repeated syncs.
  let fills;
  try {
    fills = await fetchAllFills(connection.apiKey, apiSecret, {});
  } catch (e: any) {
    return res.status(502).json({
      error: "Delta API error: " + (e.message || "unknown"),
    });
  }

  console.log("[delta] Total fills fetched:", fills.length);

  // Existing externalIds for this user (so we don't re-insert)
  const existing = await prisma.trade.findMany({
    where: {
      userId: req.user!.id,
      source: "DELTA_IMPORT",
      externalId: { in: fills.map((f) => String(f.id)) },
    },
    select: { externalId: true },
  });
  const existingSet = new Set(existing.map((t) => t.externalId));

  // Map Delta fills → Trade rows
  const toInsert: any[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const fill of fills) {
    const externalId = String(fill.id);
    if (existingSet.has(externalId)) continue;

    // Delta nests the symbol at top level AND under `product`.
    const symbol: string | undefined =
      fill.product_symbol ?? fill.product?.symbol;

    // Delta calls the fee `commission`.
    const commissionRaw = fill.commission ?? fill.fee ?? 0;

    const price = Number(fill.price);
    const qty = Number(fill.size);
    const fee = Number(commissionRaw);
    const side = String(fill.side).toLowerCase() === "buy" ? "BUY" : "SELL";

    if (!symbol || !Number.isFinite(price) || !Number.isFinite(qty)) {
      skipped.push({
        id: externalId,
        reason: `Missing fields (symbol=${!!symbol}, price=${Number.isFinite(
          price
        )}, qty=${Number.isFinite(qty)})`,
      });
      continue;
    }

    toInsert.push({
      userId: req.user!.id,
      symbol: symbol.toUpperCase(),
      side: side as "BUY" | "SELL",
      status: "OPEN" as const,
      quantity: qty,
      entryPrice: price,
      entryTime: new Date(fill.created_at),
      fees: fee,
      tags: [],
      source: "DELTA_IMPORT",
      externalId,
    });
  }

  let imported = 0;
  if (toInsert.length > 0) {
    const result = await prisma.trade.createMany({ data: toInsert });
    imported = result.count;
  }

  await prisma.brokerConnection.update({
    where: { id: connection.id },
    data: { lastSyncAt: new Date() },
  });

  res.json({
    imported,
    skippedDuplicates: fills.length - toInsert.length - skipped.length,
    skippedInvalid: skipped.length,
    totalFetched: fills.length,
    errors: skipped.slice(0, 20),
  });
});

/**
 * DELETE /brokers/:id
 * Disconnect. Does NOT delete imported trades.
 */
router.delete("/:id", async (req: AuthRequest, res) => {
  const connection = await prisma.brokerConnection.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!connection)
    return res.status(404).json({ error: "Connection not found" });

  await prisma.brokerConnection.delete({ where: { id: connection.id } });
  res.json({ ok: true });
});

export default router;
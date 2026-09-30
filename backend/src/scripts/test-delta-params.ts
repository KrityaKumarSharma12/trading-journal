import "dotenv/config";
import crypto from "crypto";
import fetch from "node-fetch";
import { prisma } from "../lib/prisma";
import { decrypt } from "../services/crypto.service";

const DELTA_BASE_URL = "https://api.india.delta.exchange";

let API_KEY = "";
let API_SECRET = "";

function buildSignature(
  apiSecret: string,
  method: string,
  path: string,
  timestamp: string,
  queryString: string = ""
) {
  const payload = `${method}${timestamp}${path}${queryString}`;
  return crypto.createHmac("sha256", apiSecret).update(payload).digest("hex");
}

async function tryPageSize(pageSize: number) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawQuery = `page_size=${pageSize}`;
  const signedQuery = `?${rawQuery}`;
  const signature = buildSignature(
    API_SECRET,
    "GET",
    "/v2/fills",
    timestamp,
    signedQuery
  );
  const url = `${DELTA_BASE_URL}/v2/fills${signedQuery}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "api-key": API_KEY, timestamp, signature },
    });
    const text = await res.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    const count = Array.isArray(parsed?.result) ? parsed.result.length : "n/a";

    console.log(
      `page_size=${String(pageSize).padEnd(6)} → ${res.status} — returned ${count}`
    );

    if (res.status !== 200) {
      console.log("  error:", text.slice(0, 200));
    }

    return count;
  } catch (e: any) {
    console.log(`page_size=${pageSize} → ERROR: ${e.message}`);
    return null;
  }
}

async function main() {
  const conn = await prisma.brokerConnection.findFirst({
    where: { broker: "DELTA_INDIA" },
  });

  if (!conn) {
    console.error("No Delta connection found. Connect Delta first.");
    await prisma.$disconnect();
    return;
  }

  API_KEY = conn.apiKey;
  API_SECRET = decrypt(conn.apiSecret);

  console.log("Loaded API key:", API_KEY);
  console.log("Secret length:", API_SECRET.length);
  console.log();

  console.log("--- page_size upper limit test ---");
  await tryPageSize(100);
  await tryPageSize(200);
  await tryPageSize(300);
  await tryPageSize(500);
  await tryPageSize(1000);
  await tryPageSize(2000);
  await tryPageSize(5000);
  await tryPageSize(10000);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
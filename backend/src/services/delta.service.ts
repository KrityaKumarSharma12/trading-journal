import crypto from "crypto";
import fetch from "node-fetch";

const DELTA_BASE_URL = "https://api.india.delta.exchange";

export interface DeltaFill {
  id: string;
  order_id?: string;
  product_id?: number;
  product_symbol?: string;
  product?: { symbol: string };
  side: "buy" | "sell";
  size: string;
  price: string;
  commission?: string;
  fee?: string;
  created_at: string;
  [key: string]: any;
}

export interface DeltaFillsResponse {
  success: boolean;
  result: DeltaFill[];
  meta?: {
    after?: string | null;
    before?: string | null;
  };
}

/**
 * Build the HMAC-SHA256 signature required by Delta's private endpoints.
 * Signature is computed over: METHOD + TIMESTAMP + PATH + QUERY_STRING
 */
function buildSignature(
  apiSecret: string,
  method: string,
  path: string,
  timestamp: string,
  queryString: string = ""
): string {
  const payload = `${method}${timestamp}${path}${queryString}`;
  return crypto.createHmac("sha256", apiSecret).update(payload).digest("hex");
}

/**
 * Make a signed GET request to Delta's private API.
 */
async function signedGet<T>(
  apiKey: string,
  apiSecret: string,
  path: string,
  query: Record<string, string | number> = {}
): Promise<T> {
  const timestamp = String(Math.floor(Date.now() / 1000));

  const rawQuery = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

  const signedQuery = rawQuery ? `?${rawQuery}` : "";

  const signature = buildSignature(
    apiSecret,
    "GET",
    path,
    timestamp,
    signedQuery
  );

  const url = `${DELTA_BASE_URL}${path}${signedQuery}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "api-key": apiKey,
      timestamp,
      signature,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Delta API ${response.status}: ${
        text.slice(0, 300) || response.statusText
      }`
    );
  }

  return (await response.json()) as T;
}

/**
 * Verify credentials by hitting a lightweight endpoint.
 */
export async function testConnection(
  apiKey: string,
  apiSecret: string
): Promise<{ ok: true; user?: any }> {
  const data = await signedGet<{ success: boolean; result: any }>(
    apiKey,
    apiSecret,
    "/v2/profile"
  );
  if (!data.success) {
    throw new Error("Delta rejected the credentials");
  }
  return { ok: true, user: data.result };
}

/**
 * Fetch all fills from Delta in a single call.
 *
 * Delta's /v2/fills honors `page_size` up to at least 10,000, and returns
 * all fills in one response when page_size is large enough. Time-based
 * filters (start_time, end_time) are NOT supported reliably on this
 * endpoint — Delta silently ignores them, so we don't use them.
 *
 * Default page_size=500 gives plenty of headroom for most accounts.
 * If a user has more than 500 fills, the most recent 500 are returned
 * and subsequent syncs will pick up newer fills as they happen.
 */
export async function fetchAllFills(
  apiKey: string,
  apiSecret: string,
  options: { pageSize?: number } = {}
): Promise<DeltaFill[]> {
  const { pageSize = 500 } = options;

  const data = await signedGet<DeltaFillsResponse>(
    apiKey,
    apiSecret,
    "/v2/fills",
    { page_size: pageSize }
  );

  if (!data.success || !Array.isArray(data.result)) {
    throw new Error("Delta /v2/fills returned an unexpected response");
  }

  console.log(`[delta] fetched ${data.result.length} fills in one call`);
  return data.result;
}
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// FX handler. Real daily rates from frankfurter.dev (ECB, no key), pivoted
// through USD so one fetch serves every user and currency pair. Three layers of
// cache and fallback, in order of preference:
//   1. a short lived in-memory map (per server instance),
//   2. today's rows in the shared fx_rates table,
//   3. the most recent rows in fx_rates, even if stale.
// If all of that fails for a currency, it is simply absent from the returned
// map and the UI leaves those amounts in their own currency. Never a crash,
// never a fabricated rate. Writes go through the service role, which is what
// the fx_rates RLS expects.

const PIVOT = "USD";
const MEM_TTL_MS = 1000 * 60 * 60 * 6; // six hours
const FETCH_TIMEOUT_MS = 4000;

// quote code -> { rate: USD per 1 unit? no: units of quote per 1 USD, at: ms }
const memory = new Map<string, { rate: number; at: number }>();

type UsdRates = Record<string, number>; // quote -> quote units per 1 USD

async function fetchUsdRates(quotes: string[]): Promise<UsdRates> {
  const symbols = quotes.filter((q) => q !== PIVOT).join(",");
  if (symbols === "") return {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${PIVOT}&symbols=${symbols}`,
      { signal: controller.signal, cache: "no-store" },
    );
    if (!res.ok) return {};
    const data = (await res.json()) as { rates?: Record<string, number> };
    return data.rates ?? {};
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

async function readTableRates(quotes: string[]): Promise<UsdRates> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("fx_rates")
      .select("quote, rate, captured_at")
      .eq("base", PIVOT)
      .in("quote", quotes)
      .order("captured_at", { ascending: false });
    const out: UsdRates = {};
    for (const row of data ?? []) {
      // First row per quote wins (newest, thanks to the order above).
      if (out[row.quote] == null) out[row.quote] = Number(row.rate);
    }
    return out;
  } catch {
    return {};
  }
}

async function upsertTableRates(rates: UsdRates): Promise<void> {
  const rows = Object.entries(rates).map(([quote, rate]) => ({
    base: PIVOT,
    quote,
    rate,
    captured_at: new Date().toISOString(),
  }));
  rows.push({ base: PIVOT, quote: PIVOT, rate: 1, captured_at: new Date().toISOString() });
  try {
    const admin = createAdminClient();
    await admin.from("fx_rates").upsert(rows, { onConflict: "base,quote" });
  } catch {
    // Best effort: a failed cache write must not break the request.
  }
}

// Resolve "quote units per 1 USD" for each requested code, walking the cache
// layers. USD is always 1.
async function loadUsdRates(codes: string[]): Promise<UsdRates> {
  const result: UsdRates = {};
  const missing: string[] = [];
  const now = Date.now();

  for (const code of new Set(codes)) {
    if (code === PIVOT) {
      result[code] = 1;
      continue;
    }
    const cached = memory.get(code);
    if (cached && now - cached.at < MEM_TTL_MS) {
      result[code] = cached.rate;
    } else {
      missing.push(code);
    }
  }

  if (missing.length === 0) return result;

  const fresh = await fetchUsdRates(missing);
  if (Object.keys(fresh).length > 0) {
    for (const [code, rate] of Object.entries(fresh)) {
      result[code] = rate;
      memory.set(code, { rate, at: now });
    }
    void upsertTableRates(fresh);
  }

  // Anything the upstream did not return falls back to the cached table.
  const stillMissing = missing.filter((c) => result[c] == null);
  if (stillMissing.length > 0) {
    const table = await readTableRates(stillMissing);
    for (const [code, rate] of Object.entries(table)) {
      result[code] = rate;
    }
  }

  return result;
}

// Build a map of base units per one unit of each currency, ready for
// convertToBase. The base maps to 1; any code that could not be priced is
// omitted on purpose.
export async function getBaseRateMap(
  base: string,
  currencies: string[],
): Promise<Record<string, number>> {
  const codes = Array.from(new Set([PIVOT, base, ...currencies]));
  const usd = await loadUsdRates(codes);

  const usdToBase = base === PIVOT ? 1 : usd[base];
  const map: Record<string, number> = {};

  for (const code of new Set([base, ...currencies])) {
    if (code === base) {
      map[code] = 1;
      continue;
    }
    const usdToCode = code === PIVOT ? 1 : usd[code];
    if (usdToBase != null && usdToCode != null && usdToCode !== 0) {
      // base per 1 code = (code per USD)^-1 expressed against base:
      // (USD->base) / (USD->code).
      map[code] = usdToBase / usdToCode;
    }
  }

  return map;
}

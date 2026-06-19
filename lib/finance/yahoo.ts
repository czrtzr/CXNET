import "server-only";
import type { Quote, Candle, SearchHit, HistoryRange } from "./market";

// Yahoo Finance access, server side only. Three concerns:
//   1. Quotes + fundamentals (price, 52 week band, dividend, P/E, volume) from
//      the v7 quote endpoint, which now needs a cookie + crumb handshake.
//   2. Historical OHLC from the open v8 chart endpoint, for the charts.
//   3. Symbol search from the open v1 search endpoint, for Look Up.
// Everything is cached in memory and degrades gracefully: if the crumbed quote
// fails, price and name fall back to the chart endpoint and the richer fields
// are simply absent. Unofficial endpoints, so this is defensive by design and
// never throws to the caller.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const TIMEOUT_MS = 5000;

async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: { "user-agent": UA, ...(init?.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

// --- cookie + crumb -------------------------------------------------------
let auth: { cookie: string; crumb: string; at: number } | null = null;
const AUTH_TTL_MS = 1000 * 60 * 30;

async function getAuth(): Promise<{ cookie: string; crumb: string } | null> {
  if (auth && Date.now() - auth.at < AUTH_TTL_MS) return auth;
  try {
    const seed = await timedFetch("https://fc.yahoo.com");
    const setCookies = seed.headers.getSetCookie?.() ?? [];
    const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
    if (!cookie) return null;

    const crumbRes = await timedFetch(
      "https://query1.finance.yahoo.com/v1/test/getcrumb",
      { headers: { cookie } },
    );
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.includes("<")) return null;

    auth = { cookie, crumb, at: Date.now() };
    return auth;
  } catch {
    return null;
  }
}

function epochToIso(seconds: unknown): string | null {
  if (typeof seconds !== "number" || seconds <= 0) return null;
  const d = new Date(seconds * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// --- quotes ---------------------------------------------------------------
const quoteCache = new Map<string, { data: Quote; at: number }>();
const QUOTE_TTL_MS = 1000 * 60 * 5;

async function fetchChartMeta(symbol: string): Promise<Quote | null> {
  try {
    const res = await timedFetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      symbol,
      price: num(meta.regularMarketPrice),
      currency: typeof meta.currency === "string" ? meta.currency : null,
      name:
        (typeof meta.shortName === "string" && meta.shortName) ||
        (typeof meta.longName === "string" && meta.longName) ||
        symbol,
      changePct: null,
      dayHigh: num(meta.regularMarketDayHigh),
      dayLow: num(meta.regularMarketDayLow),
      fiftyTwoHigh: num(meta.fiftyTwoWeekHigh),
      fiftyTwoLow: num(meta.fiftyTwoWeekLow),
      marketCap: null,
      peRatio: null,
      dividendRate: null,
      dividendYield: null,
      exDividend: null,
      volume: num(meta.regularMarketVolume),
      avgVolume: null,
      quoteType: typeof meta.instrumentType === "string" ? meta.instrumentType : null,
    };
  } catch {
    return null;
  }
}

async function fetchQuoteRich(symbol: string): Promise<Quote | null> {
  const creds = await getAuth();
  if (!creds) return null;
  try {
    const res = await timedFetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&crumb=${encodeURIComponent(creds.crumb)}`,
      { headers: { cookie: creds.cookie } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const r = json?.quoteResponse?.result?.[0];
    if (!r) return null;
    const yieldRaw = num(r.trailingAnnualDividendYield) ?? num(r.dividendYield);
    return {
      symbol,
      price: num(r.regularMarketPrice),
      currency: typeof r.currency === "string" ? r.currency : null,
      name:
        (typeof r.longName === "string" && r.longName) ||
        (typeof r.shortName === "string" && r.shortName) ||
        symbol,
      changePct: num(r.regularMarketChangePercent),
      dayHigh: num(r.regularMarketDayHigh),
      dayLow: num(r.regularMarketDayLow),
      fiftyTwoHigh: num(r.fiftyTwoWeekHigh),
      fiftyTwoLow: num(r.fiftyTwoWeekLow),
      marketCap: num(r.marketCap),
      peRatio: num(r.trailingPE),
      dividendRate: num(r.trailingAnnualDividendRate) ?? num(r.dividendRate),
      // Yield arrives as a fraction from some feeds and a percent from others.
      dividendYield:
        yieldRaw == null ? null : yieldRaw < 1 ? yieldRaw * 100 : yieldRaw,
      exDividend: epochToIso(r.dividendDate),
      volume: num(r.regularMarketVolume),
      avgVolume: num(r.averageDailyVolume3Month),
      quoteType: typeof r.quoteType === "string" ? r.quoteType : null,
    };
  } catch {
    return null;
  }
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const key = symbol.toUpperCase();
  const cached = quoteCache.get(key);
  if (cached && Date.now() - cached.at < QUOTE_TTL_MS) return cached.data;

  const rich = await fetchQuoteRich(key);
  const data = rich ?? (await fetchChartMeta(key));
  if (data) quoteCache.set(key, { data, at: Date.now() });
  return data;
}

// --- history --------------------------------------------------------------
const historyCache = new Map<string, { data: Candle[]; at: number }>();
const HISTORY_TTL_MS = 1000 * 60 * 10;

function intervalFor(range: HistoryRange): string {
  return range === "5y" ? "1wk" : "1d";
}

export async function getHistory(
  symbol: string,
  range: HistoryRange,
): Promise<Candle[]> {
  const key = `${symbol.toUpperCase()}:${range}`;
  const cached = historyCache.get(key);
  if (cached && Date.now() - cached.at < HISTORY_TTL_MS) return cached.data;

  try {
    const res = await timedFetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${intervalFor(range)}`,
    );
    if (!res.ok) return cached?.data ?? [];
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const ts: number[] = result?.timestamp ?? [];
    const q = result?.indicators?.quote?.[0];
    if (!q) return cached?.data ?? [];

    const out: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const o = num(q.open?.[i]);
      const h = num(q.high?.[i]);
      const l = num(q.low?.[i]);
      const c = num(q.close?.[i]);
      if (o != null && h != null && l != null && c != null) {
        out.push({ t: ts[i] * 1000, o, h, l, c });
      }
    }
    historyCache.set(key, { data: out, at: Date.now() });
    return out;
  } catch {
    return cached?.data ?? [];
  }
}

// --- search ---------------------------------------------------------------
export async function searchSymbol(query: string): Promise<SearchHit[]> {
  try {
    const res = await timedFetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const quotes: unknown[] = json?.quotes ?? [];
    return quotes
      .map((raw) => {
        const q = raw as Record<string, unknown>;
        return {
          symbol: typeof q.symbol === "string" ? q.symbol : "",
          name:
            (typeof q.shortname === "string" && q.shortname) ||
            (typeof q.longname === "string" && q.longname) ||
            "",
          type: typeof q.quoteType === "string" ? q.quoteType : "",
          exchange: typeof q.exchange === "string" ? q.exchange : "",
        };
      })
      .filter((h) => h.symbol !== "");
  } catch {
    return [];
  }
}

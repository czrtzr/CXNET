import "server-only";
import type {
  Quote,
  Candle,
  SearchHit,
  MiniQuote,
  HistoryRange,
  HistoryResult,
  HistorySession,
} from "./market";
import { INTRADAY_RANGES } from "./market";

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

// Lightweight batch: price, daily change, currency for several symbols at once.
// Used to annotate search results, where a full per symbol quote would be slow.
export async function getMiniQuotes(
  symbols: string[],
): Promise<Record<string, MiniQuote>> {
  const out: Record<string, MiniQuote> = {};
  const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase()))).slice(0, 10);
  if (unique.length === 0) return out;

  const creds = await getAuth();
  if (!creds) return out;
  try {
    const res = await timedFetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(unique.join(","))}&crumb=${encodeURIComponent(creds.crumb)}`,
      { headers: { cookie: creds.cookie } },
    );
    if (!res.ok) return out;
    const json = await res.json();
    const rows: unknown[] = json?.quoteResponse?.result ?? [];
    for (const raw of rows) {
      const r = raw as Record<string, unknown>;
      const sym = typeof r.symbol === "string" ? r.symbol : null;
      if (!sym) continue;
      out[sym] = {
        symbol: sym,
        price: num(r.regularMarketPrice),
        changePct: num(r.regularMarketChangePercent),
        currency: typeof r.currency === "string" ? r.currency : null,
      };
    }
    return out;
  } catch {
    return out;
  }
}

// --- history --------------------------------------------------------------
const historyCache = new Map<string, { data: HistoryResult; at: number }>();
const EMPTY: HistoryResult = { points: [], session: null };

function intervalFor(range: HistoryRange): string {
  if (range === "1d") return "5m";
  if (range === "5d") return "15m";
  if (range === "5y") return "1wk";
  return "1d";
}

// Intraday data turns over fast and should poll fresh; daily data can sit
// longer.
function ttlFor(range: HistoryRange): number {
  return INTRADAY_RANGES.includes(range) ? 1000 * 45 : 1000 * 60 * 10;
}

export async function getHistory(
  symbol: string,
  range: HistoryRange,
): Promise<HistoryResult> {
  const key = `${symbol.toUpperCase()}:${range}`;
  const cached = historyCache.get(key);
  if (cached && Date.now() - cached.at < ttlFor(range)) return cached.data;

  const intraday = INTRADAY_RANGES.includes(range);
  try {
    const res = await timedFetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${intervalFor(range)}${intraday ? "&includePrePost=true" : ""}`,
    );
    if (!res.ok) return cached?.data ?? EMPTY;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const ts: number[] = result?.timestamp ?? [];
    const q = result?.indicators?.quote?.[0];
    if (!q) return cached?.data ?? EMPTY;

    const points: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const o = num(q.open?.[i]);
      const h = num(q.high?.[i]);
      const l = num(q.low?.[i]);
      const c = num(q.close?.[i]);
      if (o != null && h != null && l != null && c != null) {
        points.push({ t: ts[i] * 1000, o, h, l, c });
      }
    }

    // Regular session open and close, for the intraday markers.
    const reg = result?.meta?.currentTradingPeriod?.regular;
    const session: HistorySession | null =
      intraday && num(reg?.start) != null && num(reg?.end) != null
        ? { open: reg.start * 1000, close: reg.end * 1000 }
        : null;

    const data: HistoryResult = { points, session };
    historyCache.set(key, { data, at: Date.now() });
    return data;
  } catch {
    return cached?.data ?? EMPTY;
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

// Client safe market types and constants, shared by the server Yahoo client and
// the client charts. No server-only imports here, so it can cross the boundary
// into client components (the server fetching logic stays in yahoo.ts).

export type Quote = {
  symbol: string;
  price: number | null;
  currency: string | null;
  name: string | null;
  changePct: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoHigh: number | null;
  fiftyTwoLow: number | null;
  marketCap: number | null;
  peRatio: number | null;
  dividendRate: number | null;
  dividendYield: number | null;
  exDividend: string | null;
  volume: number | null;
  avgVolume: number | null;
  quoteType: string | null;
  // Yahoo's session phase: REGULAR, PRE, POST, CLOSED, PREPRE, POSTPOST.
  marketState: string | null;
};

export type Candle = { t: number; o: number; h: number; l: number; c: number };

export type SearchHit = {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
};

// Compact quote for annotating search results with a daily move.
export type MiniQuote = {
  symbol: string;
  price: number | null;
  changePct: number | null;
  currency: string | null;
};

export const HISTORY_RANGES = [
  "1d",
  "5d",
  "1mo",
  "3mo",
  "6mo",
  "1y",
  "5y",
] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

// Intraday ranges carry minute-level data and a known trading session.
export const INTRADAY_RANGES: readonly HistoryRange[] = ["1d", "5d"];

// Regular market open and close for the session, epoch milliseconds.
export type HistorySession = { open: number; close: number };

export type HistoryResult = {
  points: Candle[];
  session: HistorySession | null;
};

// Human-readable market status for the position header. Prefers Yahoo's
// authoritative marketState; falls back to the session window against the
// current time when the rich quote is unavailable. Returns null when there is
// nothing to say (no quote and no session).
export type MarketStatus = {
  label: string;
  tone: "live" | "manual" | "neutral";
  open: boolean;
};

export function marketStatus(
  marketState: string | null | undefined,
  session: HistorySession | null,
  now: number = Date.now(),
): MarketStatus | null {
  switch (marketState) {
    case "REGULAR":
      return { label: "Market open", tone: "live", open: true };
    case "PRE":
    case "PREPRE":
      return { label: "Pre-market", tone: "manual", open: false };
    case "POST":
    case "POSTPOST":
      return { label: "After hours", tone: "manual", open: false };
    case "CLOSED":
      return { label: "Market closed", tone: "neutral", open: false };
  }
  // No marketState (rich quote failed): infer from the session window.
  if (session) {
    const open = now >= session.open && now < session.close;
    return open
      ? { label: "Market open", tone: "live", open: true }
      : { label: "Market closed", tone: "neutral", open: false };
  }
  return null;
}

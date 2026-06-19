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

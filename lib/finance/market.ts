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

export const HISTORY_RANGES = ["1mo", "3mo", "6mo", "1y", "5y"] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

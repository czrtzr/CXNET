// Shared symbol sanitizer. Yahoo tickers are letters, digits, and a small set
// of punctuation (e.g. BRK-B, BTC-USD, ^GSPC, RDS.A). Reject anything else so a
// symbol can never be smuggled into an upstream URL.
export function cleanSymbol(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  if (trimmed === "" || trimmed.length > 20) return null;
  return /^[A-Z0-9.\-^=]+$/.test(trimmed) ? trimmed : null;
}

// Client safe currency list and the pure conversion helper. The list mirrors the
// fiat codes frankfurter.dev publishes, so anything selectable here is something
// the FX handler can actually price. Conversion never invents a number: when no
// rate is available it returns null and the caller shows the amount in its own
// currency instead.

export type CurrencyOption = { code: string; name: string };

export const CURRENCIES: CurrencyOption[] = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "INR", name: "Indian Rupee" },
  { code: "KRW", name: "South Korean Won" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "ZAR", name: "South African Rand" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "RON", name: "Romanian Leu" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "THB", name: "Thai Baht" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "ISK", name: "Icelandic Krona" },
];

export const CURRENCY_CODES: readonly string[] = CURRENCIES.map((c) => c.code);

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === "string" && CURRENCY_CODES.includes(value);
}

// A rate map holds base units per one unit of each currency (so the base maps to
// 1). Converting is then a single multiply. Returns null when the source has no
// known rate, which the UI reads as "leave this in its own currency".
export function convertToBase(
  amount: number,
  from: string,
  base: string,
  rateMap: Record<string, number>,
): number | null {
  if (from === base) return amount;
  const rate = rateMap[from];
  if (rate == null || !Number.isFinite(rate)) return null;
  return amount * rate;
}

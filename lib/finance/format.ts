// The single money and number formatter. Nothing else in the app calls
// toLocaleString directly. Thousands are separated by a thin space, amounts
// carry two decimals (or the currency's own convention), and the sign is shown
// only when asked. Color for negatives is a display concern handled by the
// Amount component, never baked into the string.

const THIN_SPACE = " ";

// Format an amount in its currency, e.g. "$4 200.00". Falls back to the bare
// code prefix if the runtime does not know the currency.
export function formatCurrency(
  amount: number,
  currency: string,
  options: { signed?: boolean } = {},
): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);

  let body: string;
  try {
    body = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(abs);
  } catch {
    body = `${currency} ${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(abs)}`;
  }

  body = body.replace(/,/g, THIN_SPACE);
  const sign = negative ? "-" : options.signed ? "+" : "";
  return `${sign}${body}`;
}

// Plain number with thin space thousands and a fixed number of decimals.
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
    .format(value)
    .replace(/,/g, THIN_SPACE);
}

// Signed percentage, e.g. "+12.5%" or "3.2%". Pass an already-percent value.
export function formatPercent(
  value: number,
  options: { signed?: boolean; decimals?: number } = {},
): string {
  const decimals = options.decimals ?? 1;
  const sign = value > 0 && options.signed ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

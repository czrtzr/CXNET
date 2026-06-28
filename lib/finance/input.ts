// Small parsing and validation helpers shared by the server actions. Kept blunt
// and dependency free. Each returns a clean value or null, so an action can
// reject bad input with a generic message and never trust the client.

// Parse a money string ("4 200.50", "4,200.5", 4200.5) to a finite number.
export function parseAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\s, ]/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Accept only an ISO calendar date (YYYY-MM-DD) that is a real date.
export function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

// Trim, reject empty, and cap length. Returns null when nothing usable remains.
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return trimmed.slice(0, max);
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

// Normalize an email to a clean lowercase address, or null when it is not a
// plausible address. Deliberately permissive on the local part; the real
// gatekeeper is that the address must exist on the allowlist before signup.
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

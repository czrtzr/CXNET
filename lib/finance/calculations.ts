// Pure financial math shared across screens. No formatting and no IO here, so it
// runs identically on the server and client.

import type { RecurrenceInterval } from "@/types";

// Monthly equivalent of a recurring rule's cadence, so a mixed list of rules
// totals honestly. Reads naturally for both income and expense rules.
export function recurrenceMonthly(
  amount: number,
  cadence: RecurrenceInterval,
): number {
  switch (cadence) {
    case "weekly":
      return (amount * 52) / 12;
    case "biweekly":
      return (amount * 26) / 12;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "annual":
      return amount / 12;
  }
}

// Goal progress as a percentage, or null when no goal is set. Not capped, so an
// account past its goal can read over 100.
export function goalProgress(balance: number, goal: number | null): number | null {
  if (goal == null || goal <= 0) return null;
  return (balance / goal) * 100;
}

// Investment position math, all in the position's own currency. A missing price
// counts as zero value rather than throwing the totals off.
export function positionValue(shares: number, price: number | null): number {
  return shares * (price ?? 0);
}

export function costBasis(shares: number, purchase: number | null): number {
  return shares * (purchase ?? 0);
}

export function gainLoss(
  shares: number,
  price: number | null,
  purchase: number | null,
): number {
  return shares * ((price ?? 0) - (purchase ?? 0));
}

// Percent return, or null when there is no cost basis to compare against.
export function gainLossPct(
  price: number | null,
  purchase: number | null,
): number | null {
  if (price == null || purchase == null || purchase === 0) return null;
  return (price / purchase - 1) * 100;
}

// Where the current price sits within the 52 week band, 0 to 100, or null when
// the band is unknown.
export function rangePosition(
  price: number | null,
  low: number | null,
  high: number | null,
): number | null {
  if (price == null || low == null || high == null || high <= low) return null;
  return Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100));
}

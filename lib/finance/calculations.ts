// Pure financial math shared across screens. No formatting and no IO here, so it
// runs identically on the server and client.

import type { IncomeFrequency } from "@/types";

// Normalize any income cadence to a monthly figure so a mixed list totals
// honestly. A one time entry contributes nothing to the recurring monthly view.
export function monthlyEquivalent(
  amount: number,
  frequency: IncomeFrequency,
): number {
  switch (frequency) {
    case "monthly":
      return amount;
    case "weekly":
      return (amount * 52) / 12;
    case "biweekly":
      return (amount * 26) / 12;
    case "annual":
      return amount / 12;
    case "one_time":
      return 0;
  }
}

// Goal progress as a percentage, or null when no goal is set. Not capped, so an
// account past its goal can read over 100.
export function goalProgress(balance: number, goal: number | null): number | null {
  if (goal == null || goal <= 0) return null;
  return (balance / goal) * 100;
}

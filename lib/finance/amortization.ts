// Loan amortization, pure and client-safe so the schedule renders on the client
// and the payment split can be computed identically on the server. Rates are
// annual percentages (APR); the monthly rate is apr/100/12. Nothing here does IO.

export type ScheduleRow = {
  period: number;
  interest: number;
  principal: number;
  balance: number;
};

function monthlyRate(aprPct: number): number {
  return aprPct / 100 / 12;
}

// The level payment that retires `principal` over `termMonths` at this APR. Zero
// rate splits evenly. Returns null when the inputs cannot describe a loan.
export function monthlyPayment(
  principal: number,
  aprPct: number,
  termMonths: number,
): number | null {
  if (principal <= 0 || termMonths <= 0) return null;
  const r = monthlyRate(aprPct);
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

// How a single payment divides at the current balance: interest first, the rest
// to principal, never overshooting the balance.
export function splitNextPayment(
  balance: number,
  aprPct: number,
  payment: number,
): { interest: number; principal: number } {
  const r = monthlyRate(aprPct);
  const interest = Math.max(0, balance * r);
  let principal = payment - interest;
  if (principal < 0) principal = 0;
  if (principal > balance) principal = balance;
  return { interest: Math.min(interest, payment), principal };
}

// Months to clear the balance and the total interest paid, projecting forward at
// a fixed payment. feasible is false when the payment never covers the interest
// (the balance would never reach zero).
export function projectPayoff(
  balance: number,
  aprPct: number,
  payment: number,
): { months: number; totalInterest: number; feasible: boolean } {
  const r = monthlyRate(aprPct);
  if (balance <= 0) return { months: 0, totalInterest: 0, feasible: true };
  if (payment <= 0 || (r > 0 && payment <= balance * r))
    return { months: Infinity, totalInterest: 0, feasible: false };

  let bal = balance;
  let months = 0;
  let totalInterest = 0;
  while (bal > 0 && months < 1200) {
    const interest = bal * r;
    let principal = payment - interest;
    if (principal > bal) principal = bal;
    bal -= principal;
    totalInterest += Math.max(0, interest);
    months++;
  }
  return { months, totalInterest, feasible: bal <= 0.005 };
}

// The full row-by-row schedule from the current balance to payoff, capped so a
// pathological loan cannot build an unbounded array.
export function buildSchedule(
  balance: number,
  aprPct: number,
  payment: number,
  maxRows = 480,
): ScheduleRow[] {
  const r = monthlyRate(aprPct);
  const rows: ScheduleRow[] = [];
  if (balance <= 0 || payment <= 0) return rows;
  if (r > 0 && payment <= balance * r) return rows; // never amortizes

  let bal = balance;
  let period = 0;
  while (bal > 0 && period < maxRows) {
    period++;
    const interest = Math.max(0, bal * r);
    let principal = payment - interest;
    if (principal > bal) principal = bal;
    bal -= principal;
    rows.push({
      period,
      interest,
      principal,
      balance: Math.max(0, bal),
    });
  }
  return rows;
}

// The month/year a loan finishes, `months` from today. Day is dropped - these
// projections are monthly. Returns null when payoff is not reached.
export function payoffDateLabel(months: number): string | null {
  if (!Number.isFinite(months)) return null;
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

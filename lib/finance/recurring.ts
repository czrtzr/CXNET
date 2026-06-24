import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecurrenceInterval, RecurringRule } from "@/types";
import { accountDelta } from "./posting";

// Date-only math in local terms. A rule's dates are calendar dates ("YYYY-MM-DD")
// with no time, so we step them as calendar dates and never touch a clock.
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// The next due date one cadence step after `date`. Month/quarter/year steps use
// calendar arithmetic, so Jan 15 monthly → Feb 15; the usual JS month-end
// rollover (Jan 31 → Mar 3) is accepted for v1.
export function nextDate(date: string, cadence: RecurrenceInterval): string {
  const d = new Date(`${date}T00:00:00`);
  switch (cadence) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "annual":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return toISO(d);
}

function todayISO(): string {
  return toISO(new Date());
}

// Catch up every active rule whose next run has arrived, materializing one real
// entry per due period that posts to its account exactly like a manual entry.
//
// Idempotency without a lock: each period is claimed by advancing the rule's
// next_run with a conditional update (`.eq("next_run", current)`). Only the
// caller that wins the claim inserts that period's entry; a concurrent pass sees
// next_run already moved and stops. This favours a rare missed period over a
// duplicate, since a duplicate would wrongly move a balance. A per-rule guard
// caps a single pass so an ancient anchor cannot spin.
export async function generateDueRecurring(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const today = todayISO();

  const { data } = await supabase
    .from("recurring_rules")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .lte("next_run", today);
  const rules = (data ?? []) as RecurringRule[];
  if (rules.length === 0) return;

  for (const rule of rules) {
    let current = rule.next_run;
    for (let guard = 0; current <= today && guard < 400; guard++) {
      const advanced = nextDate(current, rule.cadence);

      // Claim this period. If no row comes back, another pass already took it.
      const { data: claimed } = await supabase
        .from("recurring_rules")
        .update({ next_run: advanced })
        .eq("id", rule.id)
        .eq("user_id", userId)
        .eq("next_run", current)
        .select("id");
      if (!claimed || claimed.length === 0) break;

      const sign = rule.kind === "income" ? 1 : -1;
      const posted_amount = await accountDelta(
        supabase,
        userId,
        rule.account_id,
        Number(rule.amount),
        rule.currency,
        sign,
      );

      if (rule.kind === "income") {
        await supabase.from("income").insert({
          user_id: userId,
          source: rule.label,
          amount: rule.amount,
          currency: rule.currency,
          category_id: rule.category_id,
          account_id: rule.account_id,
          posted_amount,
          recurring_rule_id: rule.id,
          date: current,
          notes: rule.notes,
        });
      } else {
        await supabase.from("expenses").insert({
          user_id: userId,
          description: rule.label,
          amount: rule.amount,
          currency: rule.currency,
          category_id: rule.category_id,
          account_id: rule.account_id,
          posted_amount,
          recurring_rule_id: rule.id,
          date: current,
          notes: rule.notes,
        });
      }

      current = advanced;
    }
  }
}

// Shared row and enum types for the CXNET data model. Hand written to match the
// SQL schema in supabase/migrations, so the app stays typed without a codegen
// step. The const arrays double as the source of truth for select options and
// server side validation.

export const USER_ROLES = ["super_admin", "user", "guest"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const INCOME_FREQUENCIES = [
  "monthly",
  "weekly",
  "biweekly",
  "annual",
  "one_time",
] as const;
export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number];

export const RECURRENCE_INTERVALS = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "annual",
] as const;
export type RecurrenceInterval = (typeof RECURRENCE_INTERVALS)[number];

export const CATEGORY_KINDS = ["expense", "income"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const RECONCILIATION_TARGETS = [
  "savings",
  "cash",
  "investment",
  "liability",
  "other",
] as const;
export type ReconciliationTarget = (typeof RECONCILIATION_TARGETS)[number];

export type ReconciliationDirection = "gain" | "shortfall";

export const INVESTMENT_TYPES = [
  "stock",
  "etf",
  "crypto",
  "bond",
  "real_estate",
  "other",
] as const;
export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

// Types that carry a live market price (the rest are manual value).
export const LIVE_INVESTMENT_TYPES: readonly InvestmentType[] = [
  "stock",
  "etf",
  "crypto",
];

export type Investment = {
  id: string;
  user_id: string;
  ticker: string | null;
  name: string | null;
  shares: number;
  purchase_price: number | null;
  current_price: number | null;
  currency: string;
  type: InvestmentType;
  is_live_priced: boolean;
  price_is_manual: boolean;
  purchase_date: string | null;
  notes: string | null;
  price_updated_at: string | null;
  created_at: string;
};

export type Income = {
  id: string;
  user_id: string;
  source: string;
  amount: number;
  currency: string;
  frequency: IncomeFrequency;
  category_id: string | null;
  date: string;
  notes: string | null;
  created_at: string;
};

export type Expense = {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  currency: string;
  category_id: string | null;
  date: string;
  notes: string | null;
  is_recurring: boolean;
  recurrence: RecurrenceInterval | null;
  created_at: string;
};

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  color: string;
  kind: CategoryKind;
};

export type Saving = {
  id: string;
  user_id: string;
  account_name: string;
  balance: number;
  currency: string;
  goal_amount: number | null;
  apy: number | null;
  institution: string | null;
  notes: string | null;
  created_at: string;
};

export type BalanceSnapshot = {
  id: string;
  user_id: string;
  captured_at: string;
  net_worth: number;
  assets: number;
  liabilities: number;
};

export type Reconciliation = {
  id: string;
  user_id: string;
  target_type: ReconciliationTarget;
  target_id: string | null;
  account_label: string;
  previous_balance: number;
  actual_balance: number;
  delta: number;
  direction: ReconciliationDirection;
  currency: string;
  note: string | null;
  captured_at: string;
  created_at: string;
};

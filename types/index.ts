// Shared row and enum types for the CXNET data model. Hand written to match the
// SQL schema in supabase/migrations, so the app stays typed without a codegen
// step. The const arrays double as the source of truth for select options and
// server side validation.

export const USER_ROLES = ["super_admin", "user", "guest"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const RECURRENCE_INTERVALS = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "annual",
] as const;
export type RecurrenceInterval = (typeof RECURRENCE_INTERVALS)[number];

export const RECURRENCE_LABELS: Record<RecurrenceInterval, string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

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

// The kinds of account a savings row can be. 'savings' is the historical
// default, so every pre-existing row keeps its meaning.
export const ACCOUNT_TYPES = [
  "savings",
  "chequing",
  "cash",
  "investment",
  "credit",
  "other",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

// Human labels for each account type, used in the form selector and on cards.
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  savings: "Savings",
  chequing: "Chequing",
  cash: "Cash",
  investment: "Investment",
  credit: "Credit",
  other: "Other",
};

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
  // The account that holds this position, or null when it counts on its own.
  // When set, the position's value mirrors into that account's balance and is
  // excluded from the standalone investments total, so nothing double-counts.
  account_id: string | null;
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
  category_id: string | null;
  account_id: string | null;
  posted_amount: number | null;
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
  account_id: string | null;
  posted_amount: number | null;
  date: string;
  notes: string | null;
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
  account_type: AccountType;
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

// A money move between two cash accounts. Cross-currency carries a distinct
// amount on each side, in that side's account currency.
export type Transfer = {
  id: string;
  user_id: string;
  from_account: string | null;
  to_account: string | null;
  from_amount: number;
  from_currency: string;
  to_amount: number;
  to_currency: string;
  note: string | null;
  occurred_at: string;
  created_at: string;
};

// The slim account shape the forms and dialogs need: enough to label the option
// and know its currency for posting.
export type AccountRef = {
  id: string;
  account_name: string;
  account_type: AccountType;
  currency: string;
};

// A recurring template that generates dated income or expense entries on a
// cadence. kind reuses CategoryKind ('income' | 'expense').
export type RecurringRule = {
  id: string;
  user_id: string;
  kind: CategoryKind;
  label: string;
  amount: number;
  currency: string;
  account_id: string | null;
  category_id: string | null;
  cadence: RecurrenceInterval;
  anchor_date: string;
  next_run: string;
  active: boolean;
  notes: string | null;
  created_at: string;
};

// One line in an account's activity log: a posting, a transfer leg, or a manual
// balance adjustment. amount is signed in the account's own currency (money in
// positive, money out negative), so the log reads as a running ledger.
export type AccountLogEntry = {
  id: string;
  kind: "income" | "expense" | "transfer_in" | "transfer_out" | "reconcile";
  label: string;
  amount: number;
  currency: string;
  date: string;
  note: string | null;
};

// ---------------------------------------------------------------------------
// Assets, liabilities, and debt payments - the balance sheet beyond cash and
// investments.
// ---------------------------------------------------------------------------
export const ASSET_TYPES = ["property", "vehicle", "other"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  property: "Property",
  vehicle: "Vehicle",
  other: "Other",
};

export const LIABILITY_TYPES = [
  "mortgage",
  "auto_loan",
  "student_loan",
  "personal_loan",
  "credit_card",
  "owed",
  "other",
] as const;
export type LiabilityType = (typeof LIABILITY_TYPES)[number];

export const LIABILITY_TYPE_LABELS: Record<LiabilityType, string> = {
  mortgage: "Mortgage",
  auto_loan: "Auto loan",
  student_loan: "Student loan",
  personal_loan: "Personal loan",
  credit_card: "Credit card",
  owed: "Owed",
  other: "Other",
};

export const DEBT_DIRECTIONS = ["owed_by_me", "owed_to_me"] as const;
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

// The slim asset shape the liability form needs to offer a "secured against"
// link without loading every column.
export type AssetRef = {
  id: string;
  name: string;
  currency: string;
};

export type Asset = {
  id: string;
  user_id: string;
  name: string;
  asset_type: AssetType;
  value: number;
  currency: string;
  purchase_price: number | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
};

export type Liability = {
  id: string;
  user_id: string;
  name: string;
  liability_type: LiabilityType;
  direction: DebtDirection;
  balance: number;
  currency: string;
  original_principal: number | null;
  interest_rate: number | null;
  term_months: number | null;
  payment_amount: number | null;
  start_date: string | null;
  asset_id: string | null;
  notes: string | null;
  created_at: string;
};

export type DebtPayment = {
  id: string;
  user_id: string;
  liability_id: string;
  account_id: string | null;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  // The figure moved in the account's currency when it differs from the debt's;
  // null when the account matches the debt (the amount itself is then used).
  account_amount: number | null;
  currency: string;
  paid_on: string;
  note: string | null;
  created_at: string;
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

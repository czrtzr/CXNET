-- CXNET — retire the legacy per-entry recurrence
-- Recurrence is now expressed only through the recurring_rules table (migration
-- 0009): rules are templates that materialize dated, one-time income and expense
-- entries. The old per-entry cadence fields on income and expenses are no longer
-- read or written by the app, so they are dropped here. The recurrence_interval
-- enum stays — recurring_rules.cadence still uses it.

alter table public.income       drop column if exists frequency;
alter table public.expenses     drop column if exists is_recurring;
alter table public.expenses     drop column if exists recurrence;

-- The income_frequency enum existed only for the dropped income.frequency column.
drop type if exists public.income_frequency;

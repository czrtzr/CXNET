-- CXNET - preset categories
-- Shared presets have user_id null, so every account reads them and no one can
-- edit or delete them (enforced by the categories RLS policies). Colors are
-- muted to sit on near-black. Names carry no hyphens, per the copy rules.

insert into public.categories (user_id, name, color, kind) values
  -- Expense presets
  (null, 'Housing',        '#7a5234', 'expense'),
  (null, 'Groceries',      '#5f8b6a', 'expense'),
  (null, 'Dining',         '#9b5b3a', 'expense'),
  (null, 'Transport',      '#5e7a8b', 'expense'),
  (null, 'Utilities',      '#6b6f7a', 'expense'),
  (null, 'Health',         '#8b5f6a', 'expense'),
  (null, 'Insurance',      '#5a6b5e', 'expense'),
  (null, 'Subscriptions',  '#7a6f8b', 'expense'),
  (null, 'Shopping',       '#a07b4f', 'expense'),
  (null, 'Entertainment',  '#8b7a3a', 'expense'),
  (null, 'Travel',         '#4f7a8b', 'expense'),
  (null, 'Education',      '#5f6f8b', 'expense'),
  (null, 'Gifts',          '#9b5b6a', 'expense'),
  (null, 'Fees',           '#7a4d4d', 'expense'),
  (null, 'Taxes',          '#7a1620', 'expense'),
  (null, 'Other',          '#6b6258', 'expense'),
  -- Income presets
  (null, 'Salary',         '#5f8b6a', 'income'),
  (null, 'Freelance',      '#7a8b5f', 'income'),
  (null, 'Dividends',      '#8b7a3a', 'income'),
  (null, 'Interest',       '#5a7a6b', 'income'),
  (null, 'Bonus',          '#b08d57', 'income'),
  (null, 'Other',          '#6b6258', 'income');

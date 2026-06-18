# CXNET — Claude Code Build Prompt

> A private, invite-only **wealth command center**. Not a budgeting app — a personal financial instrument with the gravitas of a private members' bank and the precision of a trading terminal. The codename and the brand are the same: **CXNET**.

---

## How to use this prompt

Every decision is settled below. Do not ask me to re-decide them. Before any code, reflect the design direction back to me as a short written mood board, then build in phases (see *Build in Phases*).

Treat every decision as a product decision, not just a coding decision. A beautiful app with weak security and a secure app that looks amateur are both failures.

---

## Decisions (all settled)

- **Name:** CXNET, product and repo. Design a monogram and crest mark for it; favicon, wax seal, and loading mark all derive from the crest.
- **Stack:** Next.js 16 (App Router), to match my TLC setup. Account for Next 16 quirks (async `cookies()` and `headers()`, server actions, route handlers).
- **Visual ambition:** the full ornamental SVG system below is in scope (guilloché, wax seals, vault open, certificate framing, bespoke charts). This is the differentiator, not optional polish.
- **Palette:** deep oxblood red, brown leather, dark grey, black. Luxurious. Exact tokens below.
- **Typography:** private bank direction. A refined serif (Fraunces or Newsreader) for headings and the large balance figures, a neutral sans (Inter or Geist) for body and labels, a mono (Geist Mono) for tickers and IDs. Tabular figures for all amounts.
- **Super admin:** seeded, un-deletable account is `feitcarter@gmail.com`.
- **Registration model (email allowlist, no codes or links):** the super admin adds an email in admin settings. Only allowlisted emails can create an account. The signup path is otherwise hidden. A person whose email was added goes to the normal login screen, registers a password, and lands in their own fresh ledger. On first login of a brand new account, show a brief, quiet welcome. No public signup.
- **Currency:** multi-currency. Each money row stores its own currency; the user picks a display base currency; convert with FX rates (cached, with a sane fallback). Net worth and totals render in the base currency.
- **Asset classes:** Stocks and ETFs (live priced via Yahoo), Crypto (live priced), Real estate and Bonds and other (manual value, no live price). Allocation donut spans all of them.
- **Categories:** ship a curated preset palette (each with an assigned color) and let the user add custom ones.
- **Mobile:** native feel, co-equal with desktop. Bottom nav, swipe gestures, full screen pages, pixel perfect on phone.
- **v1 scope:** all features in *Features*, plus the no-regret additions (quiet and privacy mode, net-worth history snapshots, designed empty, loading, and error states, `prefers-reduced-motion` fallbacks). Statements export, audit log viewer, and recurring expense management are built into the schema now but their UI is deferred to v1.1.

---

## Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend/DB:** Supabase (Postgres + Auth + Row Level Security)
- **Hosting:** Vercel
- **Email:** Resend, optional. Used only for an optional welcome email when the super admin adds a new email to the allowlist. The in-app first-login welcome is the primary greeting, so the app must work fully without Resend configured.
- **Stock and crypto prices:** Yahoo Finance. Route through a server-side handler (not the client) with an in-memory cache (5 min TTL) and a graceful fallback when the upstream fails, so positions show a cached price and an offline badge, never a crash.
- **FX rates:** a server-side handler with a cached daily rate table and a fallback, for multi-currency conversion to the base currency.
- **Animation:** Framer Motion throughout. No CSS-only animation for anything interactive. **Every animation must have a `prefers-reduced-motion` fallback** that renders the final state instantly.
- **Charts:** hero charts are **bespoke SVG** (see below). Recharts permitted only as a fallback for secondary charts.

---

## Design System — Non-Negotiable

The most important part. Every component must feel intentional, quiet, and expensive.

**Aesthetic.** Dark luxury. The feeling of opening a leather-bound ledger on a walnut desk in a dim study — oxblood leather, brass hardware, crimson wax, engraved banknote line-work — fused with a modern trading terminal: monospace tickers, hairline grids, live data. Deep warm near-black (never cold blue-black). Square corners (border-radius ≤ 4px — never rounded cards). Thin precise borders at ~8% warm-white opacity. Grid-aligned layouts, generous whitespace, everything on an 8px grid.

**Color tokens** (define once in Tailwind config + CSS variables; nothing ad hoc):

```
--bg-deep        #0a0807   /* warm near-black, faint brown cast — not cold */
--surface        #15120f   /* dark grey-brown */
--surface-raised #1d1813
--surface-hover  #251f19
--border         rgba(233,214,190,0.08)   /* warm hairline */
--border-strong  rgba(233,214,190,0.14)

--red            #7a1620   /* deep oxblood — primary interactive accent */
--red-bright     #9b2230   /* hover / focus glow */
--red-deep       #4d0e15   /* pressed / ambient */

--leather        #5e3d24   /* brown leather */
--leather-light  #7a5234
--leather-deep   #3a2415

--brass          #b08d57   /* OPTIONAL metallic — engraving hairlines & wax-seal rims only, used sparingly */

--text           #f1ece4   /* warm white, never pure white */
--text-muted     rgba(241,236,228,0.45)
--text-faint     rgba(241,236,228,0.28)

--pos            #5f8b6a   /* gains — muted sage, never neon green */
--neg            #9b2230   /* losses — reuse oxblood */
```

Oxblood red is the **primary interactive accent** (buttons, active states, focus glow, losses). Leather is structural/decorative (frames, dividers, certificate borders, category accents). Brass is a restrained metallic reserved for engraved line-art and wax-seal rims — use it like real gold leaf: rarely.

**Typography.** Private bank direction.
- Headings and large balances: a refined serif (Fraunces or Newsreader), tight tracking, tabular figures. The hero of every screen.
- Body and labels: a neutral sans (Inter or Geist). Labels are small, uppercase, wide letter spacing, `--text-muted`.
- Tickers and IDs: mono (Geist Mono).
- Body is clean and readable, never dense.

**Animation principles.**
- Page transitions: coordinated fade + translate, children stagger in.
- Numbers: count-up on mount and on change.
- Charts: draw in on load.
- Hover: subtle glow or border brightening — never jarring.
- Inputs: lift slightly on focus with an oxblood border glow.
- Toasts: slide up from bottom-right, auto-dismiss with a progress bar.
- All of the above degrade to instant final state under `prefers-reduced-motion`.

**Layout.**
- Desktop: fixed 220px sidebar + scrollable main.
- Mobile: bottom nav (5 tabs), full-screen pages, swipe-friendly.

---

## The Ornamental SVG System — the Signature

The visual language of money is vector engraving. SVG is the brand, not decoration. Build a small set of reusable SVG primitives and use them with restraint and consistency.

1. **Guilloché engine** — a procedural SVG generator producing rosette/rope/spirograph line-work (the engraving on banknotes & stock certificates). Parameterized (node count, amplitude, radius, color, opacity). Reused as: login background (slow drift), card watermark behind hero numbers, statement borders, and empty-state art. Always low-opacity, brass or leather lines on near-black.
2. **Crest + monogram** — an engraved SVG mark for CXNET. Drives the logo lockup, favicon, the wax seal, and the loading indicator.
3. **Wax-seal confirmations** — a meaningful action (confirm a transaction, add someone to the allowlist) stamps an animated SVG wax seal bearing the crest, with a soft press + settle. Reduced-motion: appears instantly.
4. **Vault-open transition** — first paint after login plays like a safe door / ledger cover opening: an SVG mask wipe with an oxblood sweep revealing the dashboard.
5. **Stock-certificate header** — the net-worth hero sits in an engraved frame with filigree corners and a count-up numeral, like the header of a share certificate.
6. **Bespoke SVG charts** — hand-built:
   - *Net-worth area/line*: gradient fill, draw-in path, a "comet" dot leading the latest point, animated value label.
   - *Allocation & spending donuts*: animated arc draw-in, conic/segmented gradients, center total count-up.
7. **Engraved icon family** — one consistent thin-stroke SVG icon set (no mixing icon libraries).
8. **Grain + vignette** — an SVG noise filter overlay + radial vignette so the near-black has depth and never looks flat.
9. **Admission certificate** — on first login, a new account is greeted with an embossed, wax-sealed certificate: "You have been admitted to CXNET," before entering their fresh ledger.

---

## Security — Production Grade

- Supabase Auth for all authentication (email + password, with email confirmation).
- **Row Level Security on every table** — users see only their own rows, period. Comment each policy clearly.
- Roles in `profiles.role`: `super_admin | user | guest`. The super admin (`feitcarter@gmail.com`) is seeded at setup and cannot be deleted.
- **Email allowlist registration, no public signup.** The super admin adds an email to an allowlist in admin settings. Only an allowlisted email can create an account. The person goes to the normal login screen, sets a password, and lands in their own fresh ledger. New accounts see a brief quiet welcome on first login. Enforce the allowlist on the server, not just the client.
- **Guest demo account** is pre-seeded and read only (`guest@cxnet.app` / `GuestDemo2024`), loaded with realistic fake data across every section. Guests cannot create, edit, or delete. A top banner reads: "You are viewing a demo. Sign in to get started." (no em dashes, no hyphens.)
- Every API route / server action validates the session server-side. RLS is the backstop, not the only gate.
- Never send the client anything beyond what the authenticated user owns.
- Rate-limit auth and allowlist endpoints.
- HTTPS enforced on Vercel; security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy) in `next.config.js`.

---

## Data Model (Supabase / Postgres)

Define these tables with RLS. Adjust names to taste but keep the shape explicit — do not leave the schema to chance.

- `profiles`: id (=auth.uid), email, display_name, role, base_currency, avatar_url, is_active, has_onboarded, created_at, last_active_at
- `allowlist`: id, email, added_by, welcome_email_sent_at, created_at. Gates registration. An email here may create exactly one account.
- `income`: id, user_id, source, amount, currency, frequency (`monthly|weekly|biweekly|annual|one_time`), date, notes, created_at
- `expenses`: id, user_id, description, amount, currency, category_id, date, notes, is_recurring, recurrence, created_at
- `categories`: id, user_id (null for presets), name, color, kind (`expense|income`)
- `investments`: id, user_id, ticker, name, shares, purchase_price, current_price, currency, type (`stock|etf|crypto|bond|real_estate|other`), is_live_priced, price_is_manual (when true, the user pinned current_price by hand and the refresh job skips this row until live pricing is resumed), purchase_date, notes, price_updated_at
- `savings`: id, user_id, account_name, balance, currency, goal_amount, apy, institution, notes
- `reconciliations`: id, user_id, target_type (`savings|cash|investment|liability|other`), target_id (fk to the row being corrected, nullable for a top level cash position), account_label, previous_balance, actual_balance, delta, direction (`gain|shortfall`), currency, note, captured_at, created_at. The audit trail of every manual balance set across **any** account or position. `delta` is the miscellaneous difference booked when a tracked value was corrected to the real one. The matching adjustment is what moves the account, so a value is never silently overwritten.
- `balance_history`: id, user_id, captured_at, net_worth, assets, liabilities (stored in base currency). Powers the net worth over time chart; write on meaningful changes and on a daily job.
- `fx_rates`: base, quote, rate, captured_at. Cached conversion table.
- `audit_log`: id, actor_id, action, target, metadata, created_at. Admin actions and auth events.

Number and currency formatting: one helper for amounts (tabular figures, thin space thousands, negatives in oxblood, two decimal currency, signed percentages, base currency conversion applied at display). No raw `toLocaleString` scattered around.

---

## Features

**Auth.** Full screen centered login (crest, email, password) over a slow drifting guilloché background. No public signup. Forgot password flow. An allowlisted email logs in for the first time, sets a password, and is taken into a fresh empty ledger framed like the invite certificate ("You have been admitted to CXNET"), then a brief quiet welcome. A non allowlisted email is refused without leaking whether the address exists.

**Sidebar / Nav.** Crest + name at top. Items: Dashboard, Income, Expenses, Investments, Savings, (Admin — super admin only). Bottom: avatar + name, settings, lock/logout. Active state: oxblood left-border + slightly raised background. A **quiet-mode toggle** here blurs all balances app-wide.

**Dashboard.** Net-worth hero in the certificate header (count-up, assets vs liabilities). Cashflow bar (monthly income vs spend, savings rate). Spending donut. Portfolio-allocation donut. Net-worth-over-time area chart from `balance_history`. Recent-activity feed (last 10 across all categories).

**Income.** Form (source, amount, frequency, date, notes). List with frequency badge + muted monthly-equivalent. Total monthly income on top.

**Expenses.** Form (description, amount, category, date, notes, recurring). Color-coded category left-border per row. Newest first, groupable by month.

**Investments.** Form (ticker, name, shares, purchase price, currency, type, date, notes). Types: stock, ETF, crypto (all live priced via Yahoo, with a "Look Up" button that fetches current price and name) and real estate, bond, other (manual value, no live price). Position cards: ticker or name badge, live or offline or manual badge, current value, gain or loss in amount and percent, cost basis. "Refresh prices" updates all live positions. Portfolio total on top, in base currency.

  **Manual override on positions.** Any field on a position is editable by hand, including shares, purchase price, and the current price or value, even on a live priced holding. When a person overrides the current price on a live position, the position switches to a **manual** badge and stops auto refreshing so the feed cannot stomp the entered number; a one tap **Resume live pricing** control hands it back to Yahoo. The same "Set actual balance" reconcile flow also applies here for correcting a position's total value directly, booking the difference to `reconciliations` like everywhere else.

**Savings.** Form (account, balance, goal, APY, institution, notes). Animated goal-progress fill bar + percentage. Total savings on top.

**Reconcile (manual balance set) — works everywhere.** Every account or position that carries a value (savings, a top level cash position, investments, liabilities, manual assets) has a *tracked value* built from its inputs plus every logged movement. Real life drifts from the ledger, so each one gets a "Set actual balance" action. The person types what it truly holds right now; the app computes the gap against the tracked value and books it as a single labeled adjustment, written to `reconciliations` (a **gain** when the real total is higher, a **shortfall** when it is lower), dated now, with an optional note. The tracked value then equals the actual figure, and the adjustment appears in that account's history, so nothing is ever silently overwritten. The flow:
  1. Open an account or position, choose **Set actual balance**.
  2. Enter the true total. The dialog previews the difference live ("tracked 4,200.00, actual 4,000.00, books a 200.00 shortfall") before anything is saved.
  3. Confirm with the wax-seal stamp; the adjustment is recorded and the value snaps to the actual.
  A small **Adjusted** badge marks anything corrected this way, and a running sum of these miscellaneous differences (per account and overall) shows how much of a balance came from untracked activity. This keeps the ledger honest for anyone who forgets to log every move while preserving a full audit trail. Reconciliation adjustments feed `balance_history` like any other change, so the net worth curve stays truthful. Guests can preview the flow but cannot save.

**Admin (super admin only).** User table (name, email, role, joined, last active). Allowlist management: add an email, see whether it has registered yet, remove an email that has not yet registered, optionally resend the welcome email. Deactivate (never hard delete) users. Guest access toggle.

**Settings.** Display name, avatar, base currency selection, quiet mode default, password change.

**Every screen** ships designed **empty**, **loading** (SVG shimmer skeletons, not spinners), and **error/validation** states. Adds and edits are **optimistic**, reconciled after the server responds.

---

## Accessibility & Performance

- Honor `prefers-reduced-motion` everywhere (final state, instantly).
- AA contrast on near-black; visible oxblood focus rings; full keyboard nav; ARIA on interactive components.
- Lazy-load charts; memoize expensive renders; don't animate off-screen elements; cap guilloché complexity. Set a sensible client-JS budget.

---

## File Structure (Next.js App Router)

```
/app
  /login  /welcome  /dashboard  /income  /expenses  /investments  /savings
  /settings  /admin
/components
  /ui      (Button, Input, Card, Modal, Toast, Badge, Skeleton)
  /charts  (NetWorthChart, DonutChart, BarChart)
  /svg     (Guilloche, Crest, WaxSeal, Grain, CertificateFrame)
  /layout  (Sidebar, MobileNav, PageTransition, QuietModeToggle)
  /auth    (LoginForm, FirstRunWelcome)
/lib
  /supabase  (client, server, middleware)
  /finance   (prices, fx, formatting, calculations, networth)
  /utils
/types
```

---

## Seed Data (Guest Account)

Six months of realistic data: 3 income sources (salary, freelance, dividends); 30+ expenses across all categories; 6 investment positions (mix of stocks/ETFs/crypto with real tickers); 3 savings accounts (emergency fund nearly complete, vacation goal ~60%, house down-payment just started); and `balance_history` snapshots so the net-worth chart has a real six-month curve.

---

## Voice & Copy

- **No em dashes and no hyphens in any user-facing text.** Rephrase instead of hyphenating (write "near black", "count up", "log in"). This is a hard rule across labels, buttons, empty states, errors, emails, and seed data.
- Sleek and spare. Only the text that is needed. No filler, no tooltips explaining the obvious, no welcome banners, no exclamation marks, no emoji.
- Quiet and confident, like a private bank statement. Short noun labels over chatty sentences.
- **Must not read as AI generated.** Avoid the tells: generic "Welcome to your dashboard," purple gradients, rounded glassmorphism, stock-photo hero copy, over-symmetry, lorem ipsum, and the same three adjectives on every card. Make deliberate, slightly opinionated choices a designer would make. When in doubt, remove words and tighten alignment rather than add.

---

## Build in Phases

Do not build the whole thing then debug at the end. Ship in phases. **At the end of each phase, stop and verify: run the app, fix all type errors, console errors, broken routes, and obvious bugs, and confirm the phase works before starting the next one.** Report what you verified at each checkpoint.

1. **Foundation** — Next 16 + TS + Tailwind scaffold, design tokens, Supabase project, schema + RLS, auth wiring. *Checkpoint: app boots, can log in, RLS blocks cross-user reads.*
2. **Design primitives** — `/components/ui` and `/components/svg` (Crest, Guilloche, Grain, WaxSeal, CertificateFrame), typography, layout shell (Sidebar, MobileNav, PageTransition). *Checkpoint: a styled empty shell renders on desktop and mobile, reduced-motion respected.*
3. **Core data screens** — Income, Expenses, Savings (including reconcile / manual balance set with the difference booked to `reconciliations`): forms, lists, optimistic CRUD, empty/loading/error states. *Checkpoint: full CRUD works, a manual balance set books the correct gain or shortfall adjustment and the tracked balance matches the actual, RLS verified, no console errors.*
4. **Investments + prices** — Yahoo lookup via server handler, cache, offline fallback, position cards. *Checkpoint: lookup + refresh work, failure degrades gracefully.*
5. **Dashboard + bespoke charts** — net-worth certificate header, custom SVG charts, balance_history, quiet mode. *Checkpoint: charts draw in with real data, count-ups correct.*
6. **Allowlist + admin + guest seed** — allowlist registration, first login welcome, admin panel, seeded guest demo. *Checkpoint: only allowlisted emails can register, new account sees the welcome once, guest is read only, admin actions logged.*
7. **Signature polish** — vault-open transition, wax-seal confirmations, guilloché backgrounds, grain/vignette, final accessibility + performance pass. *Checkpoint: full walkthrough on desktop and mobile, no regressions.*

---

## Definition of Done

- All open questions answered; mood board confirmed in writing before building.
- Every table has commented RLS; super admin and guest seeded; allowlist gating verified on the server (a non allowlisted email cannot register), first login welcome shows once.
- Every screen has empty/loading/error states and a working reduced-motion fallback.
- The ornamental SVG system (guilloché, crest, wax seal, vault-open, certificate header, bespoke charts) is implemented and consistent.
- Design tokens live in one place; number formatting goes through one helper.
- `README.md` covers: local setup, Supabase setup, env vars, Vercel deploy, and seeding the guest account.

---

## Final Instructions

- Ask the open questions, then wait. Confirm the design direction as a short written mood board before any code.
- Build in phases with a verification checkpoint between each. Do not defer debugging to the end.
- Prioritize design quality and security equally.
- Comment all RLS policies clearly.
- Follow the Voice & Copy rules. The words are part of the luxury, and they must not read as AI generated.

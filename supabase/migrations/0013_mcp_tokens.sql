-- CXNET - MCP personal access tokens
-- Each row is one bearer token a user mints to connect their own Claude (Claude
-- Desktop / Claude Code) to CXNET as a remote MCP server. Only the SHA-256 hash
-- is stored; the plaintext is shown once at creation and never persisted.
--
-- The MCP route resolves a presented token with the service-role client (RLS
-- off) because the request carries no Supabase session. Token management from
-- the app (mint, list, revoke) goes through the user's own session and is gated
-- by the policies below, so a user only ever sees or touches their own tokens.

create table public.mcp_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  name         text not null,
  token_hash   text not null unique,
  last_used_at timestamptz,
  revoked      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index idx_mcp_tokens_user on public.mcp_tokens (user_id, created_at desc);
create index idx_mcp_tokens_hash on public.mcp_tokens (token_hash);

alter table public.mcp_tokens enable row level security;

-- Own rows only, in every direction. Guests (the shared demo) cannot mint
-- tokens. The service role bypasses all of this for token resolution.
create policy "mcp_tokens: read own" on public.mcp_tokens for select
  using (user_id = auth.uid());
create policy "mcp_tokens: insert own" on public.mcp_tokens for insert
  with check (user_id = auth.uid() and not public.is_guest());
create policy "mcp_tokens: update own" on public.mcp_tokens for update
  using (user_id = auth.uid() and not public.is_guest())
  with check (user_id = auth.uid());
create policy "mcp_tokens: delete own" on public.mcp_tokens for delete
  using (user_id = auth.uid() and not public.is_guest());

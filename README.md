# CXNET

A private, invite only wealth command center. Next.js 16, Supabase, Vercel.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project at https://supabase.com, then copy its API
   settings into a local env file:

   ```bash
   cp .env.example .env.local
   ```

   Fill in from Supabase dashboard > Project Settings > API:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only, never exposed)
   - `SUPER_ADMIN_EMAIL` (defaults to the seeded super admin)

3. Apply the database schema and Row Level Security. Install the
   [Supabase CLI](https://supabase.com/docs/guides/cli), then:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

4. Seed the un-deletable super admin (prints a one time password if you did not
   set `SUPER_ADMIN_PASSWORD`):

   ```bash
   npm run seed:admin
   ```

5. (Optional) Seed the read-only demo account that powers the "Explore the
   demo" link on the login screen. Set `DEMO_EMAIL` and `DEMO_PASSWORD` in
   `.env.local` first (the app signs in with the same pair):

   ```bash
   npm run seed:demo
   ```

   Re-running it resets the demo to its original data.

6. Run the app:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 and sign in as the super admin.

## Notes

- `NEXT_PUBLIC_` values are inlined at build time. Set them before running
  `npm run build`. For `npm run dev`, restart after editing `.env.local`.
- Row Level Security is the real access gate. The proxy redirects are only a
  convenience.

// Centralized read of the public Supabase config.
// Reading through here lets the rest of the app degrade gracefully when the
// project has not been configured yet (boots without keys, auth simply fails).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// True only once both public values are present.
export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

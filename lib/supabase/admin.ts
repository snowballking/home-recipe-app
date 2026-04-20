import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service role key.
// This bypasses RLS — use only in trusted server-side code (API routes).
// Never import this in client components.

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. " +
      "Find SUPABASE_SERVICE_ROLE_KEY in Supabase Dashboard → Settings → API → service_role (secret)."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

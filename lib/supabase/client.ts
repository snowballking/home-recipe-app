import { createBrowserClient } from "@supabase/ssr";

// Keep one browser client per module. Recreating this object on every render
// invalidates hook dependencies and can re-run data-loading effects.
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export function createClient() {
  return supabase;
}

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Service-role client. Bypasses RLS, so it is only for requests that have
 * already been authenticated some other way — the Health Auto Export ingest
 * endpoint (bearer token) and the weekly review cron (CRON_SECRET).
 *
 * Never import this into a client component.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing SUPABASE_SECRET_KEY. Add it to .env.local.");
  }

  return createClient(SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

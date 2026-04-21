import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicCredentials } from "./public-env";

export function createClient() {
  const creds = getSupabasePublicCredentials();
  if (!creds) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or anon/publishable key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }
  return createBrowserClient(creds.url, creds.anonKey);
}

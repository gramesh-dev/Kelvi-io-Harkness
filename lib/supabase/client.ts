import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicCredentialsOrPlaceholder } from "./public-env";

export function createClient() {
  const creds = getSupabasePublicCredentialsOrPlaceholder();
  return createBrowserClient(creds.url, creds.anonKey);
}

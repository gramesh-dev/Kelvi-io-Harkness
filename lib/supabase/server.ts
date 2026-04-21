import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicCredentials } from "./public-env";

export async function createClient() {
  const creds = getSupabasePublicCredentials();
  if (!creds) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or anon/publishable key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    creds.url,
    creds.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Components where cookies are read-only
          }
        },
      },
    }
  );
}

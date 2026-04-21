import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicCredentialsOrPlaceholder } from "./public-env";

export async function createClient() {
  const creds = getSupabasePublicCredentialsOrPlaceholder();

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

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
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

/**
 * Route Handler / proxy-safe Supabase client: reads session cookies from the
 * incoming Request. On Vercel, `cookies()` from `next/headers` in Route Handlers
 * can miss the browser's Cookie header; RSC (`createClient()`) still uses
 * `cookies()` and sees the session — use this in handlers when auth must match
 * the page.
 */
export function createClientFromRequest(request: NextRequest) {
  const creds = getSupabasePublicCredentialsOrPlaceholder();
  return createServerClient(creds.url, creds.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
        } catch {
          /* Request cookies may be immutable in some runtimes; reads still work. */
        }
      },
    },
  });
}

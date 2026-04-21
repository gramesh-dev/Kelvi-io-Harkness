/**
 * Public Supabase URL + anon/publishable key for browser, SSR, and Edge middleware.
 * Vercel setups often use NEXT_PUBLIC_SUPABASE_ANON_KEY; .env.local.example uses the
 * publishable key name — support both so middleware never receives undefined keys.
 */
export function getSupabasePublicCredentials(): {
  url: string;
  anonKey: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/**
 * Supabase demo-shaped placeholder so `createServerClient` / `createBrowserClient`
 * never receive empty strings during `next build` when env is only injected at
 * runtime (e.g. some CI). Not used when real env vars are present.
 */
export const SUPABASE_BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";

/** Valid JWT shape (Supabase demo anon); session still comes from cookies when real. */
export const SUPABASE_BUILD_PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export function getSupabasePublicCredentialsOrPlaceholder(): {
  url: string;
  anonKey: string;
} {
  return (
    getSupabasePublicCredentials() ?? {
      url: SUPABASE_BUILD_PLACEHOLDER_URL,
      anonKey: SUPABASE_BUILD_PLACEHOLDER_ANON_KEY,
    }
  );
}

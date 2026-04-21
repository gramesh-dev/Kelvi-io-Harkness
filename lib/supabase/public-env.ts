/**
 * Data API screens sometimes show `https://xxx.supabase.co/rest/v1` — that path is only
 * for PostgREST. Auth lives at `/auth/v1` off the project origin; if the base URL includes
 * `/rest/v1`, OAuth becomes `.../rest/v1/auth/v1/authorize` and fails with "No API key".
 */
export function normalizeSupabaseProjectUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const u = new URL(trimmed);
    const p = u.pathname.replace(/\/$/, "") || "";
    if (p === "/rest/v1" || p.startsWith("/rest/v1/")) {
      return u.origin;
    }
    return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
  } catch {
    return trimmed
      .replace(/\/rest\/v1\/?$/, "")
      .replace(/\/$/, "");
  }
}

/**
 * Public Supabase URL + anon/publishable key for browser, SSR, and Edge middleware.
 * Vercel setups often use NEXT_PUBLIC_SUPABASE_ANON_KEY; .env.local.example uses the
 * publishable key name — support both so middleware never receives undefined keys.
 */
export function getSupabasePublicCredentials(): {
  url: string;
  anonKey: string;
} | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!rawUrl || !anonKey) return null;
  return { url: normalizeSupabaseProjectUrl(rawUrl), anonKey };
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

/** True when real `NEXT_PUBLIC_SUPABASE_*` were present at build time (not the build placeholder). */
export function hasRealSupabasePublicConfig(): boolean {
  return getSupabasePublicCredentials() !== null;
}

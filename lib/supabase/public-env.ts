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

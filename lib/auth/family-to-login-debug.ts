/**
 * Temporary diagnostics when /family sends the user to /login.
 * Never log cookie values, tokens, or Authorization headers.
 */
export type FamilyToLoginDebugPayload = {
  route: "/family";
  stage: "proxy" | "family-layout";
  hasCookieHeader: boolean;
  supabaseCookieNames: string[];
  getUserEmail: string | null;
  getUserError: string | null;
  redirectReason: string;
};

export function logFamilyToLoginDebug(payload: FamilyToLoginDebugPayload): void {
  console.warn("[kelvi/auth-debug]", JSON.stringify(payload));
}

export function pickSupabaseCookieNames(
  cookies: ReadonlyArray<{ name: string }>
): string[] {
  return cookies.map((c) => c.name).filter((n) => n.startsWith("sb-"));
}

/** Short auth error hint; redacts values that look like JWTs. */
export function safeGetUserErrorMessage(error: unknown): string | null {
  if (error == null) return null;
  if (typeof error === "object" && "message" in error) {
    const msg = String((error as { message: unknown }).message);
    if (/^eyJ/i.test(msg) || msg.length > 120) return "error-message-redacted";
    return msg.slice(0, 120);
  }
  return "unknown";
}

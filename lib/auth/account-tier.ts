/** Stored in profiles.metadata.kelvi_account_tier once billing exists. */
export type AccountTierKey = "standard" | "premium" | "pilot" | "school";

const LABELS: Record<AccountTierKey, string> = {
  standard: "Standard",
  premium: "Premium",
  pilot: "Pilot",
  school: "School",
};

export function resolveAccountTierLabel(
  metadata: Record<string, unknown> | null | undefined
): { key: AccountTierKey; label: string } {
  const raw = metadata?.kelvi_account_tier;
  const key =
    raw === "premium" || raw === "pilot" || raw === "school"
      ? raw
      : "standard";
  return { key, label: LABELS[key] };
}

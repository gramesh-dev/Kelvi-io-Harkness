"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  BETA_ALLOWED_ROLES,
  isPlatformAdmin,
  normalizeEmail,
  type BetaAllowedRole,
} from "@/lib/auth/invite-only";

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function parseAllowedRoles(values: FormDataEntryValue[]): BetaAllowedRole[] {
  const chosen = values
    .map((v) => String(v))
    .filter((v): v is BetaAllowedRole =>
      (BETA_ALLOWED_ROLES as readonly string[]).includes(v)
    );
  return chosen.length > 0 ? chosen : [...BETA_ALLOWED_ROLES];
}

async function requirePlatformAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const ok = await isPlatformAdmin(supabase, user.id, user.email ?? null);
  if (!ok) {
    redirect("/post-login");
  }
  return user;
}

export async function sendBetaInviteAction(formData: FormData) {
  const user = await requirePlatformAdminUser();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const note = String(formData.get("note") ?? "").trim() || null;
  const allowedRoles = parseAllowedRoles(formData.getAll("roles"));

  if (!email || !email.includes("@")) {
    redirect("/admin?notice=invalid-email");
  }

  const admin = createServiceClient();
  const nowIso = new Date().toISOString();

  const { error: upsertError } = await admin.from("beta_access_invites").upsert(
    {
      email,
      invited_by: user.id,
      status: "pending",
      invited_at: nowIso,
      note,
      allowed_roles: allowedRoles,
    },
    { onConflict: "email" }
  );

  if (upsertError) {
    redirect("/admin?notice=invite-save-failed");
  }

  const redirectTo = `${appBaseUrl()}/callback`;
  const otpResult = await admin.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo,
    },
  });

  if (otpResult.error) {
    redirect("/admin?notice=invite-email-failed");
  }

  revalidatePath("/admin");
  redirect("/admin?notice=invite-sent");
}

export async function updateBetaInviteStatusAction(formData: FormData) {
  await requirePlatformAdminUser();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const nextStatus = String(formData.get("status") ?? "").trim();

  if (!email || !["pending", "accepted", "revoked"].includes(nextStatus)) {
    redirect("/admin?notice=invite-update-failed");
  }

  const admin = createServiceClient();
  const { error } = await admin
    .from("beta_access_invites")
    .update({ status: nextStatus })
    .eq("email", email);

  if (error) {
    redirect("/admin?notice=invite-update-failed");
  }

  revalidatePath("/admin");
  redirect("/admin?notice=invite-updated");
}

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

async function sendInviteEmail(admin = createServiceClient(), email: string) {
  const redirectTo = `${appBaseUrl()}/callback`;
  return admin.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo,
    },
  });
}

async function upsertBetaInviteAndSendEmail(params: {
  admin: ReturnType<typeof createServiceClient> | Awaited<ReturnType<typeof createClient>>;
  invitedBy: string;
  email: string;
  note: string | null;
  allowedRoles: BetaAllowedRole[];
}) {
  const nowIso = new Date().toISOString();
  const { error: upsertError } = await params.admin.from("beta_access_invites").upsert(
    {
      email: params.email,
      invited_by: params.invitedBy,
      status: "pending",
      invited_at: nowIso,
      note: params.note,
      allowed_roles: params.allowedRoles,
    },
    { onConflict: "email" }
  );

  if (upsertError) {
    return { ok: false as const, reason: "save" as const };
  }

  const otpResult = await sendInviteEmail(
    params.admin as ReturnType<typeof createServiceClient>,
    params.email
  );
  if (otpResult.error) {
    return { ok: false as const, reason: "email" as const };
  }

  return { ok: true as const };
}

async function requirePlatformAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  console.log("[admin/actions] requirePlatformAdminUser", {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    getUserError: getUserError?.message ?? null,
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnonKey: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    ),
    hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasAdminEmails: Boolean(process.env.INVITE_ONLY_ADMIN_EMAILS),
    supabaseUrlPrefix: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").slice(0, 20),
  });

  if (!user) {
    redirect("/login");
  }
  const ok = await isPlatformAdmin(supabase, user.id, user.email ?? null);
  console.log("[admin/actions] isPlatformAdmin →", { ok, email: user.email });
  if (!ok) {
    redirect("/post-login");
  }
  return { user, supabase };
}

export async function sendBetaInviteAction(formData: FormData) {
  const { user, supabase } = await requirePlatformAdminUser();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const requestId = String(formData.get("request_id") ?? "").trim() || null;
  const roleRequested = String(formData.get("role_requested") ?? "").trim().toLowerCase();
  const roleFromWaitlist = mapWaitlistRoleToAllowedRoles(roleRequested);
  const note =
    String(formData.get("note") ?? "").trim() ||
    (requestId ? `Invited from waitlist (${roleRequested || "unspecified"})` : null);
  const submittedRoles = parseAllowedRoles(formData.getAll("roles"));
  const allowedRoles =
    submittedRoles.length > 0 ? submittedRoles : roleFromWaitlist.length > 0 ? roleFromWaitlist : [...BETA_ALLOWED_ROLES];

  if (!email || !email.includes("@")) {
    redirect("/admin?notice=invalid-email");
  }

  const serviceRoleAvailable = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const admin = serviceRoleAvailable ? createServiceClient() : supabase;
  const result = await upsertBetaInviteAndSendEmail({
    admin,
    invitedBy: user.id,
    email,
    note,
    allowedRoles,
  });
  if (!result.ok && result.reason === "save") {
    redirect("/admin?notice=invite-save-failed");
  }
  if (!result.ok && result.reason === "email") {
    redirect("/admin?notice=invite-email-failed");
  }

  if (requestId) {
    await admin
      .from("waitlist_requests")
      .update({ status: "contacted" })
      .eq("id", requestId);
  }

  revalidatePath("/admin");
  redirect(requestId ? "/admin?notice=waitlist-invited" : "/admin?notice=invite-sent");
}

export async function resendBetaInviteAction(formData: FormData) {
  const { user, supabase } = await requirePlatformAdminUser();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email || !email.includes("@")) {
    redirect("/admin?notice=invalid-email");
  }

  const serviceRoleAvailable = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const admin = serviceRoleAvailable ? createServiceClient() : supabase;
  const { data: invite } = await admin
    .from("beta_access_invites")
    .select("allowed_roles,note")
    .eq("email", email)
    .maybeSingle();

  if (!invite) {
    redirect("/admin?notice=invite-save-failed");
  }

  const result = await upsertBetaInviteAndSendEmail({
    admin,
    invitedBy: user.id,
    email,
    note: invite.note ?? null,
    allowedRoles: (invite.allowed_roles as BetaAllowedRole[] | null) ?? [...BETA_ALLOWED_ROLES],
  });
  if (!result.ok && result.reason === "save") {
    redirect("/admin?notice=invite-update-failed");
  }
  if (!result.ok && result.reason === "email") {
    redirect("/admin?notice=invite-email-failed");
  }

  revalidatePath("/admin");
  redirect("/admin?notice=invite-resent");
}

export async function updateBetaInviteStatusAction(formData: FormData) {
  const { supabase } = await requirePlatformAdminUser();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const nextStatus = String(formData.get("status") ?? "").trim();

  if (!email || !["pending", "accepted", "revoked"].includes(nextStatus)) {
    redirect("/admin?notice=invite-update-failed");
  }

  const serviceRoleAvailable = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const admin = serviceRoleAvailable ? createServiceClient() : supabase;
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

function mapWaitlistRoleToAllowedRoles(roleRequested: string): BetaAllowedRole[] {
  if (roleRequested === "family") return ["family"];
  if (roleRequested === "school") return ["school"];
  if (roleRequested === "individual") return ["individual"];
  return [...BETA_ALLOWED_ROLES];
}

export async function archiveWaitlistRequestAction(formData: FormData) {
  const { supabase } = await requirePlatformAdminUser();
  const requestId = String(formData.get("request_id") ?? "").trim();
  if (!requestId) {
    redirect("/admin?notice=waitlist-archive-failed");
  }

  const serviceRoleAvailable = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const admin = serviceRoleAvailable ? createServiceClient() : supabase;
  const { error } = await admin
    .from("waitlist_requests")
    .update({ status: "archived" })
    .eq("id", requestId);

  if (error) {
    redirect("/admin?notice=waitlist-archive-failed");
  }

  revalidatePath("/admin");
  redirect("/admin?notice=waitlist-archived");
}

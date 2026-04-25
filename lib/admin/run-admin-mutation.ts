import { revalidatePath } from "next/cache";
import { getCurrentPlatformAdmin } from "@/lib/auth/admin-auth";
import type { AdminMutationAction } from "@/lib/auth/admin-mutations";
import { createServiceClient } from "@/lib/supabase/service";
import {
  BETA_ALLOWED_ROLES,
  normalizeEmail,
  type BetaAllowedRole,
} from "@/lib/auth/invite-only";

export type AdminMutationResult =
  | { ok: true; notice: string }
  | { ok: false; message: string; code?: string };

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function parseAllowedRoles(values: unknown): BetaAllowedRole[] {
  if (!Array.isArray(values)) return [...BETA_ALLOWED_ROLES];
  const chosen = values.filter((v): v is BetaAllowedRole =>
    (BETA_ALLOWED_ROLES as readonly string[]).includes(String(v))
  );
  return chosen.length > 0 ? chosen : [...BETA_ALLOWED_ROLES];
}

function mapWaitlistRoleToAllowedRoles(roleRequested: string): BetaAllowedRole[] {
  const r = roleRequested.trim().toLowerCase();
  if (r === "family") return ["family"];
  if (r === "school") return ["school"];
  if (r === "individual") return ["individual"];
  return [...BETA_ALLOWED_ROLES];
}

async function sendInviteEmail(serviceClient: ReturnType<typeof createServiceClient>, email: string) {
  return serviceClient.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${appBaseUrl()}/callback`,
    },
  });
}

/**
 * Shared admin mutation logic. Used by the Server Action (cookies() work here)
 * so we do not depend on the browser attaching Cookie headers to fetch().
 */
export async function runAdminMutation(input: {
  action: AdminMutationAction;
  payload: Record<string, unknown>;
}): Promise<AdminMutationResult> {
  const { action, payload } = input;

  const auth = await getCurrentPlatformAdmin();
  if (!auth.ok) {
    if (auth.message) {
      return { ok: false, message: auth.message, code: auth.code };
    }
    if (auth.code === "not-platform-admin") {
      return { ok: false, message: "You do not have platform admin access.", code: auth.code };
    }
    return { ok: false, message: "Not authenticated.", code: auth.code };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { ok: false, message: "Service role key is not configured.", code: "config" };
  }

  const serviceClient = createServiceClient();
  const { user } = auth;
  const nowIso = new Date().toISOString();

  try {
    switch (action) {
      case "send_invite": {
        const email = normalizeEmail(String(payload.email ?? ""));
        if (!email || !email.includes("@")) {
          return { ok: false, message: "Enter a valid email address.", code: "invalid_email" };
        }
        const noteRaw = String(payload.note ?? "").trim();
        const { data: existingInvite } = await serviceClient
          .from("beta_access_invites")
          .select("note,allowed_roles")
          .eq("email", email)
          .maybeSingle();
        const rolesFromForm = Array.isArray(payload.roles) ? payload.roles : undefined;
        const allowedRoles =
          rolesFromForm !== undefined && rolesFromForm.length > 0
            ? parseAllowedRoles(rolesFromForm)
            : ((existingInvite?.allowed_roles as BetaAllowedRole[] | null)?.length
                ? (existingInvite!.allowed_roles as BetaAllowedRole[])
                : parseAllowedRoles(undefined));
        const note =
          noteRaw ||
          (typeof existingInvite?.note === "string" && existingInvite.note.trim()
            ? existingInvite.note
            : null);
        const { error: upsertError } = await serviceClient.from("beta_access_invites").upsert(
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
          console.error("[admin/mutation] send_invite upsert", upsertError.message);
          return { ok: false, message: "Could not save invite.", code: "save_failed" };
        }
        const { error: emailError } = await sendInviteEmail(serviceClient, email);
        if (emailError) {
          console.error("[admin/mutation] send_invite email", emailError.message);
          return { ok: false, message: "Invite saved but email could not be sent.", code: "email_failed" };
        }
        revalidatePath("/admin");
        return { ok: true, notice: "invite-sent" };
      }

      case "invite_waitlist": {
        const requestId = String(payload.request_id ?? "").trim();
        const email = normalizeEmail(String(payload.email ?? ""));
        const roleRequested = String(payload.role_requested ?? "").trim().toLowerCase();
        if (!requestId || !email || !email.includes("@")) {
          return { ok: false, message: "Missing waitlist id or email.", code: "bad_request" };
        }
        const allowedRoles = mapWaitlistRoleToAllowedRoles(roleRequested);
        const note = `Invited from waitlist (${roleRequested || "unspecified"})`;
        const { error: upsertError } = await serviceClient.from("beta_access_invites").upsert(
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
          console.error("[admin/mutation] invite_waitlist upsert", upsertError.message);
          return { ok: false, message: "Could not save invite.", code: "save_failed" };
        }
        const { error: emailError } = await sendInviteEmail(serviceClient, email);
        if (emailError) {
          console.error("[admin/mutation] invite_waitlist email", emailError.message);
          return { ok: false, message: "Invite saved but email could not be sent.", code: "email_failed" };
        }
        const { error: wlError } = await serviceClient
          .from("waitlist_requests")
          .update({ status: "contacted" })
          .eq("id", requestId);
        if (wlError) {
          console.error("[admin/mutation] invite_waitlist waitlist", wlError.message);
          return {
            ok: false,
            message: "Invite sent but waitlist row was not updated.",
            code: "waitlist_update_failed",
          };
        }
        revalidatePath("/admin");
        return { ok: true, notice: "waitlist-invited" };
      }

      case "delete_waitlist": {
        const requestId = String(payload.request_id ?? "").trim();
        if (!requestId) {
          return { ok: false, message: "Missing request id.", code: "bad_request" };
        }
        const { error } = await serviceClient
          .from("waitlist_requests")
          .update({ status: "archived" })
          .eq("id", requestId);
        if (error) {
          console.error("[admin/mutation] delete_waitlist", error.message);
          return { ok: false, message: "Could not archive waitlist request.", code: "archive_failed" };
        }
        revalidatePath("/admin");
        return { ok: true, notice: "waitlist-archived" };
      }

      case "resend_invite": {
        const email = normalizeEmail(String(payload.email ?? ""));
        if (!email || !email.includes("@")) {
          return { ok: false, message: "Enter a valid email address.", code: "invalid_email" };
        }
        const { data: invite } = await serviceClient
          .from("beta_access_invites")
          .select("allowed_roles,note")
          .eq("email", email)
          .maybeSingle();
        if (!invite) {
          return { ok: false, message: "Invite not found.", code: "not_found" };
        }
        const { error: upsertError } = await serviceClient.from("beta_access_invites").upsert(
          {
            email,
            invited_by: user.id,
            status: "pending",
            invited_at: nowIso,
            note: invite.note,
            allowed_roles: invite.allowed_roles,
          },
          { onConflict: "email" }
        );
        if (upsertError) {
          console.error("[admin/mutation] resend_invite upsert", upsertError.message);
          return { ok: false, message: "Could not update invite.", code: "save_failed" };
        }
        const { error: emailError } = await sendInviteEmail(serviceClient, email);
        if (emailError) {
          console.error("[admin/mutation] resend_invite email", emailError.message);
          return { ok: false, message: "Invite updated but email could not be sent.", code: "email_failed" };
        }
        revalidatePath("/admin");
        return { ok: true, notice: "invite-resent" };
      }

      case "revoke_invite": {
        const email = normalizeEmail(String(payload.email ?? ""));
        if (!email || !email.includes("@")) {
          return { ok: false, message: "Enter a valid email address.", code: "invalid_email" };
        }
        const { error } = await serviceClient
          .from("beta_access_invites")
          .update({ status: "revoked" })
          .eq("email", email);
        if (error) {
          console.error("[admin/mutation] revoke_invite", error.message);
          return { ok: false, message: "Could not revoke invite.", code: "update_failed" };
        }
        revalidatePath("/admin");
        return { ok: true, notice: "invite-updated" };
      }

      default:
        return { ok: false, message: "Unknown action.", code: "unknown_action" };
    }
  } catch (e) {
    console.error("[admin/mutation] unexpected", e);
    return { ok: false, message: "Something went wrong.", code: "server_error" };
  }
}

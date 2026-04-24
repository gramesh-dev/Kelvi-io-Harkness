import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentPlatformAdmin } from "@/lib/auth/admin-auth";
import type { AdminMutationAction } from "@/lib/auth/admin-mutations";
import { createServiceClient } from "@/lib/supabase/service";
import {
  BETA_ALLOWED_ROLES,
  normalizeEmail,
  type BetaAllowedRole,
} from "@/lib/auth/invite-only";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function jsonError(status: 401 | 403 | 400 | 404 | 500 | 503, code: string, message: string) {
  return NextResponse.json({ ok: false as const, code, message }, { status });
}

function adminAuthFailureMessage(
  auth: Extract<Awaited<ReturnType<typeof getCurrentPlatformAdmin>>, { ok: false }>
): string {
  if (auth.message) return auth.message;
  if (auth.code === "not-platform-admin") {
    return "You do not have platform admin access.";
  }
  return "Not authenticated.";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    payload?: Record<string, unknown>;
  } | null;

  const action = body?.action as AdminMutationAction | undefined;
  const payload = body?.payload ?? {};

  if (!action) {
    return jsonError(400, "bad_request", "Missing action.");
  }

  const auth = await getCurrentPlatformAdmin({
    request,
    debugRoute: "/api/admin/actions",
  });
  if (!auth.ok) {
    const message = adminAuthFailureMessage(auth);
    return NextResponse.json(
      {
        ok: false as const,
        code: auth.code,
        message,
        ...(auth.debug ? { debug: auth.debug } : {}),
      },
      { status: auth.status }
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return jsonError(500, "config", "Service role key is not configured.");
  }

  const serviceClient = createServiceClient();
  const { user } = auth;
  const nowIso = new Date().toISOString();

  try {
    switch (action) {
      case "send_invite": {
        const email = normalizeEmail(String(payload.email ?? ""));
        if (!email || !email.includes("@")) {
          return jsonError(400, "invalid_email", "Enter a valid email address.");
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
          console.error("[admin/actions] send_invite upsert", upsertError.message);
          return jsonError(500, "save_failed", "Could not save invite.");
        }
        const { error: emailError } = await sendInviteEmail(serviceClient, email);
        if (emailError) {
          console.error("[admin/actions] send_invite email", emailError.message);
          return jsonError(500, "email_failed", "Invite saved but email could not be sent.");
        }
        revalidatePath("/admin");
        return NextResponse.json({ ok: true as const, notice: "invite-sent" });
      }

      case "invite_waitlist": {
        const requestId = String(payload.request_id ?? "").trim();
        const email = normalizeEmail(String(payload.email ?? ""));
        const roleRequested = String(payload.role_requested ?? "").trim().toLowerCase();
        if (!requestId || !email || !email.includes("@")) {
          return jsonError(400, "bad_request", "Missing waitlist id or email.");
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
          console.error("[admin/actions] invite_waitlist upsert", upsertError.message);
          return jsonError(500, "save_failed", "Could not save invite.");
        }
        const { error: emailError } = await sendInviteEmail(serviceClient, email);
        if (emailError) {
          console.error("[admin/actions] invite_waitlist email", emailError.message);
          return jsonError(500, "email_failed", "Invite saved but email could not be sent.");
        }
        const { error: wlError } = await serviceClient
          .from("waitlist_requests")
          .update({ status: "contacted" })
          .eq("id", requestId);
        if (wlError) {
          console.error("[admin/actions] invite_waitlist waitlist", wlError.message);
          return jsonError(500, "waitlist_update_failed", "Invite sent but waitlist row was not updated.");
        }
        revalidatePath("/admin");
        return NextResponse.json({ ok: true as const, notice: "waitlist-invited" });
      }

      case "delete_waitlist": {
        const requestId = String(payload.request_id ?? "").trim();
        if (!requestId) {
          return jsonError(400, "bad_request", "Missing request id.");
        }
        const { error } = await serviceClient
          .from("waitlist_requests")
          .update({ status: "archived" })
          .eq("id", requestId);
        if (error) {
          console.error("[admin/actions] delete_waitlist", error.message);
          return jsonError(500, "archive_failed", "Could not archive waitlist request.");
        }
        revalidatePath("/admin");
        return NextResponse.json({ ok: true as const, notice: "waitlist-archived" });
      }

      case "resend_invite": {
        const email = normalizeEmail(String(payload.email ?? ""));
        if (!email || !email.includes("@")) {
          return jsonError(400, "invalid_email", "Enter a valid email address.");
        }
        const { data: invite } = await serviceClient
          .from("beta_access_invites")
          .select("allowed_roles,note")
          .eq("email", email)
          .maybeSingle();
        if (!invite) {
          return jsonError(404, "not_found", "Invite not found.");
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
          console.error("[admin/actions] resend_invite upsert", upsertError.message);
          return jsonError(500, "save_failed", "Could not update invite.");
        }
        const { error: emailError } = await sendInviteEmail(serviceClient, email);
        if (emailError) {
          console.error("[admin/actions] resend_invite email", emailError.message);
          return jsonError(500, "email_failed", "Invite updated but email could not be sent.");
        }
        revalidatePath("/admin");
        return NextResponse.json({ ok: true as const, notice: "invite-resent" });
      }

      case "revoke_invite": {
        const email = normalizeEmail(String(payload.email ?? ""));
        if (!email || !email.includes("@")) {
          return jsonError(400, "invalid_email", "Enter a valid email address.");
        }
        const { error } = await serviceClient
          .from("beta_access_invites")
          .update({ status: "revoked" })
          .eq("email", email);
        if (error) {
          console.error("[admin/actions] revoke_invite", error.message);
          return jsonError(500, "update_failed", "Could not revoke invite.");
        }
        revalidatePath("/admin");
        return NextResponse.json({ ok: true as const, notice: "invite-updated" });
      }

      default:
        return jsonError(400, "unknown_action", "Unknown action.");
    }
  } catch (e) {
    console.error("[admin/actions] unexpected", e);
    return jsonError(500, "server_error", "Something went wrong.");
  }
}

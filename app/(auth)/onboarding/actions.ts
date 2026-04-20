"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth";

/**
 * First-time family setup: create org + first membership.
 *
 * We use the service-role client here because RLS creates a deadlock otherwise:
 * - org SELECT requires is_org_member, but membership is inserted after the org
 * - org_memberships INSERT requires is_org_admin, but no admin exists yet
 *
 * The authenticated user is verified with the user-scoped client first; inserts
 * are constrained to that user's id and type = 'family' only.
 */
export async function createFamilyOrg(formData: FormData) {
  const familyName = formData.get("familyName") as string;

  if (!familyName?.trim()) {
    return { error: "Family name is required" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      error:
        "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local for onboarding.",
    };
  }

  const slug =
    familyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) +
    "-" +
    user.id.slice(0, 8);

  const admin = createServiceClient();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      type: "family",
      name: familyName.trim(),
      slug,
    })
    .select("id")
    .single();

  if (orgError) {
    return { error: orgError.message };
  }

  const { error: memberError } = await admin.from("org_memberships").insert({
    org_id: org.id,
    profile_id: user.id,
    role: "family_admin",
  });

  if (memberError) {
    return { error: memberError.message };
  }

  redirect(await getPostAuthRedirectPath());
}

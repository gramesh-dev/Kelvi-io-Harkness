"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth";
import { markKelviRoleSetupComplete } from "@/lib/auth/profile-metadata";
import { KELVI_ROLE_SETUP_METADATA_KEY } from "@/lib/auth/role-setup";

export async function submitSchoolOrg(formData: FormData) {
  const orgName = (formData.get("orgName") as string)?.trim();
  if (!orgName) {
    return { error: "School or organization name is required" };
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
        "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local.",
    };
  }

  const slug =
    orgName
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
      type: "school",
      name: orgName,
      slug,
    })
    .select("id")
    .single();

  if (orgError) {
    return { error: orgError.message };
  }

  const { error: memError } = await admin.from("org_memberships").insert({
    org_id: org.id,
    profile_id: user.id,
    role: "teacher",
  });

  if (memError) {
    return { error: memError.message };
  }

  const marked = await markKelviRoleSetupComplete(user.id);
  if (marked.error) {
    return { error: marked.error };
  }


await admin.auth.admin.updateUserById(user.id, {
  user_metadata: { role: 'teacher' }
});
  redirect(await getPostAuthRedirectPath());
}

export async function submitFamilyOrg(formData: FormData) {
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
        "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local.",
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

  const marked = await markKelviRoleSetupComplete(user.id);
  if (marked.error) {
    return { error: marked.error };
  }

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { role: 'family' }
  });

  redirect(await getPostAuthRedirectPath());
}

export async function submitStudentSegment() {
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
        "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local.",
    };
  }

  const admin = createServiceClient();

  const { data: memberships } = await admin
    .from("org_memberships")
    .select("organizations(type)")
    .eq("profile_id", user.id)
    .eq("is_active", true);

  const hasSoloOrg = (memberships ?? []).some(
    (m: any) => m.organizations?.type === "solo"
  );

  if (!hasSoloOrg) {
    const { data: profileRow } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const displayName = profileRow?.full_name?.trim() || "My learning space";
    const slug =
      "solo-" +
      user.id.replace(/-/g, "").slice(0, 12) +
      "-" +
      user.id.slice(0, 8);

    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({
        type: "solo",
        name: displayName,
        slug,
      })
      .select("id")
      .single();

    if (orgError) {
      return { error: orgError.message };
    }

    const { error: memError } = await admin.from("org_memberships").insert({
      org_id: org.id,
      profile_id: user.id,
      role: "solo_learner",
    });

    if (memError) {
      return { error: memError.message };
    }
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("metadata")
    .eq("id", user.id)
    .single();

  const meta = (profile?.metadata ?? {}) as Record<string, unknown>;
  const { error } = await admin
    .from("profiles")
    .update({
      metadata: {
        ...meta,
        kelvi_segment: "student",
        [KELVI_ROLE_SETUP_METADATA_KEY]: true,
      },
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { role: 'student' }
  });

  redirect(await getPostAuthRedirectPath());
}

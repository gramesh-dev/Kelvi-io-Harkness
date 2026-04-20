"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth";

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
  const { data: profile } = await admin
    .from("profiles")
    .select("metadata")
    .eq("id", user.id)
    .single();

  const meta = (profile?.metadata ?? {}) as Record<string, unknown>;
  const { error } = await admin
    .from("profiles")
    .update({
      metadata: { ...meta, kelvi_segment: "student" },
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  redirect(await getPostAuthRedirectPath());
}

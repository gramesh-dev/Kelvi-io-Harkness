"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth";

export async function submitSchoolOrg(formData: FormData) {
  console.log("[submitSchoolOrg] START");
  
  const supabase = await createClient();
  console.log("[submitSchoolOrg] Supabase client created");
  
  const { data: { user } } = await supabase.auth.getUser();
  console.log("[submitSchoolOrg] User fetched:", user?.id);

  if (!user) {
    console.log("[submitSchoolOrg] ERROR: Not authenticated");
    return { error: "Not authenticated" };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.log("[submitSchoolOrg] ERROR: Missing service role key");
    return { error: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing." };
  }

  console.log("[submitSchoolOrg] Creating admin client");
  const admin = createServiceClient();
  
  console.log("[submitSchoolOrg] Updating user metadata for user:", user.id);
  // Just set user role, skip org creation
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { role: 'teacher' }
  });

  if (updateError) {
    console.error("[submitSchoolOrg] Error updating user:", updateError);
    return { error: "Failed to update user role" };
  }

  console.log("[submitSchoolOrg] User metadata updated successfully");
  console.log("[submitSchoolOrg] Getting redirect path");
  const redirectPath = await getPostAuthRedirectPath();
  console.log("[submitSchoolOrg] Redirecting to:", redirectPath);
  
  redirect(redirectPath);
}

export async function submitFamilyOrg(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { error: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing." };
  }

  const admin = createServiceClient();
  
  // Just set user role, skip org creation
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { role: 'family' }
  });

  redirect(await getPostAuthRedirectPath());
}

export async function submitStudentSegment() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { error: "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing." };
  }

  const admin = createServiceClient();
  
  // Just set user role, skip org creation
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { role: 'student' }
  });

  redirect(await getPostAuthRedirectPath());
}
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth";

export async function submitSchoolOrg(formData: FormData) {
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
    user_metadata: { role: 'teacher' }
  });

  redirect(await getPostAuthRedirectPath());
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
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { role: 'teacher' }
  });

  if (updateError) {
    console.error("[submitSchoolOrg] Error updating user:", updateError);
    return { error: "Failed to update user role" };
  }

  console.log("[submitSchoolOrg] Upserting profiles table with admin client");
  // Use admin client and UPSERT to ensure row exists
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ 
      id: user.id,
      email: user.email,
      metadata: { 
        kelvi_completed_role_setup: true,
        kelvi_segment: 'school'
      } 
    }, { onConflict: 'id' });

  if (profileError) {
    console.error("[submitSchoolOrg] Error updating profile:", profileError);
    return { error: `Failed to update profile: ${profileError.message}` };
  }

  console.log("[submitSchoolOrg] User metadata and profile updated successfully");
  console.log("[submitSchoolOrg] Redirecting to /teach");
  
  redirect("/teach");
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
  
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { role: 'family' }
  });

  if (updateError) {
    console.error("Error updating user:", updateError);
    return { error: "Failed to update user role" };
  }

  // Use admin client and UPSERT
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ 
      id: user.id,
      email: user.email,
      metadata: { 
        kelvi_completed_role_setup: true,
        kelvi_segment: 'family'
      } 
    }, { onConflict: 'id' });

  if (profileError) {
    console.error("Error updating profile:", profileError);
    return { error: `Failed to update profile: ${profileError.message}` };
  }

  redirect("/family");
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
  
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { role: 'student' }
  });

  if (updateError) {
    console.error("Error updating user:", updateError);
    return { error: "Failed to update user role" };
  }

  // Use admin client and UPSERT
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ 
      id: user.id,
      email: user.email,
      metadata: { 
        kelvi_completed_role_setup: true,
        kelvi_segment: 'student'
      } 
    }, { onConflict: 'id' });

  if (profileError) {
    console.error("Error updating profile:", profileError);
    return { error: `Failed to update profile: ${profileError.message}` };
  }

  redirect("/student");
}
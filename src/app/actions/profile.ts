"use server";

import { revalidatePath } from "next/cache";

import { normalizeLinkedInProfileUrl } from "@/lib/linkedin-url";
import { createClient } from "@/lib/supabase/server";

export type UpdateLinkedInUrlResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Updates `profiles.linkedin_url` for the signed-in user (RLS: own row only).
 */
export async function updateLinkedInUrl(
  url: string
): Promise<UpdateLinkedInUrlResult> {
  const parsed = normalizeLinkedInProfileUrl(url);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ linkedin_url: parsed.url })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export type UpdateIdentityResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Updates the candidate-editable identity fields on their own profile.
 *
 * These were previously read-only and sourced from OAuth, which left testers
 * with a mis-parsed name and a permanently blank phone and no way to correct
 * either. The OAuth trigger now only seeds `full_name` when it is null, so an
 * edit made here survives the next sign-in.
 */
export async function updateIdentity(input: {
  fullName: string;
  phone: string;
}): Promise<UpdateIdentityResult> {
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();

  if (!fullName) {
    return { success: false, error: "Enter your full name." };
  }
  if (fullName.length > 120) {
    return { success: false, error: "Name is too long." };
  }
  if (phone.length > 40) {
    return { success: false, error: "Phone number is too long." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { success: true };
}

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

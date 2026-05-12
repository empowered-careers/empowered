"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type InsertResumeRowResult =
  | { success: true; id: string }
  | { success: false; error: string };

/**
 * Inserts a `resumes` row after a file was uploaded to Storage under the
 * signed-in user's folder (`{userId}/...`). Idempotent on same public URL.
 */
export async function insertResumeRow(input: {
  storageObjectPath: string;
  fileName: string;
}): Promise<InsertResumeRowResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const prefix = `${user.id}/`;
  if (!input.storageObjectPath.startsWith(prefix)) {
    return { success: false, error: "Invalid storage path." };
  }

  const { data: publicUrlData } = supabase.storage
    .from("resumes")
    .getPublicUrl(input.storageObjectPath);

  const publicUrl = publicUrlData.publicUrl;

  const { data: existing, error: existingError } = await supabase
    .from("resumes")
    .select("id")
    .eq("profile_id", user.id)
    .eq("raw_file_url", publicUrl)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  if (existing) {
    revalidatePath("/dashboard");
    return { success: true, id: existing.id };
  }

  const { data, error } = await supabase
    .from("resumes")
    .insert({
      profile_id: user.id,
      raw_file_url: publicUrl,
      file_name: input.fileName,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, id: data.id };
}

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CoursePlayer } from "@/components/coaching/course-player";
import { hasEnrollment } from "@/lib/coaching";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Course | Empowered Careers",
  robots: "noindex, nofollow",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CoursePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: product } = await supabase
    .from("coaching_products")
    .select("id, name, description, kind, external_url")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!product || product.kind !== "course") notFound();

  // Entitlement gate: enrollments only, never profiles.plan.
  const owned = await hasEnrollment(user.id, product.id);
  if (!owned) redirect("/pricing");

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, progress")
    .eq("profile_id", user.id)
    .eq("product_id", product.id)
    .maybeSingle();

  return (
    <div className="px-10 py-8">
      <CoursePlayer
        embedUrl={product.external_url}
        enrollmentId={enrollment?.id ?? null}
        initialProgress={enrollment?.progress ?? 0}
        name={product.name}
      />
    </div>
  );
}

import { redirect } from "next/navigation";

import { EmployerHeader } from "@/components/employer/employer-header";
import { EmployerRealtime } from "@/components/employer/employer-realtime";
import { EmployerSidebar } from "@/components/employer/employer-sidebar";
import { createClient } from "@/lib/supabase/server";
import type { RelationshipType } from "@/types/db";

export const metadata = {
  title: "Employer · Empowered Careers",
  robots: { index: false, follow: false },
};

/**
 * Employer shell — server-side role guard. Allows `admin` (Lauren
 * impersonation-view) and `employer`. Employers with no linked employer_id
 * are bounced to a "not linked" page; everyone else who isn't admin or
 * employer is bounced to /dashboard.
 */
export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, employer_id, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "employer") {
    redirect("/dashboard");
  }

  if (profile.role === "employer" && !profile.employer_id) {
    redirect("/employer-not-linked");
  }

  let relationshipType: RelationshipType | null = null;
  let companyName: string | null = null;
  if (profile.employer_id) {
    const { data: employer } = await supabase
      .from("employers")
      .select("relationship_type, company_name")
      .eq("id", profile.employer_id)
      .single();
    relationshipType =
      (employer?.relationship_type as RelationshipType | undefined) ?? null;
    companyName = employer?.company_name ?? null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <EmployerHeader
        companyName={companyName}
        isAdminViewer={profile.role === "admin"}
        userEmail={user.email ?? ""}
        userName={profile.full_name ?? ""}
      />
      <div className="flex min-h-0 flex-1">
        <EmployerSidebar relationshipType={relationshipType} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <EmployerRealtime />
    </div>
  );
}

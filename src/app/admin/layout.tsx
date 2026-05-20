import { redirect } from "next/navigation";

import { AdminRealtime } from "@/components/admin/admin-realtime";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin · Empowered Careers",
  robots: { index: false, follow: false },
};

/**
 * Admin shell — server-side role guard runs before any UI renders.
 * Non-admins are bounced to /dashboard; unauthenticated users to /login.
 */
export default async function AdminLayout({
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="min-w-0 flex-1">{children}</main>
      <AdminRealtime />
    </div>
  );
}

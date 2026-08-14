import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MyCoachingClient } from "@/components/coaching/my-coaching-client";
import { fetchMyCoaching } from "@/lib/coaching";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Coaching | Empowered Careers",
  robots: "noindex, nofollow",
};

export default async function ContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const coaching = await fetchMyCoaching(user.id);

  return (
    <div className="px-10 py-8">
      <MyCoachingClient coaching={coaching} />
    </div>
  );
}

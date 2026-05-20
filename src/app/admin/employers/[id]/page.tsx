import Link from "next/link";
import { notFound } from "next/navigation";

import { EmployerForm } from "@/components/admin/employer-form";
import { createClient } from "@/lib/supabase/server";
import type { EmployerRow } from "@/types/db";

export const metadata = {
  title: "Admin · Employer",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEmployerEditPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: employer } = await supabase
    .from("employers")
    .select("*")
    .eq("id", id)
    .single<EmployerRow>();

  if (!employer) notFound();

  const [{ data: jobs }, { data: placements }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, status, job_tier, posted_at")
      .eq("submitted_by", id)
      .order("posted_at", { ascending: false }),
    supabase
      .from("placements")
      .select("id, placed_at, fee_amount, status")
      .eq("employer_id", id)
      .order("placed_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-10 px-10 py-8">
      <section>
        <Link
          className="text-muted-foreground text-xs hover:text-foreground"
          href="/admin/employers"
        >
          ← All employers
        </Link>
        <h1 className="mt-2 font-display font-medium text-2xl tracking-tight">
          {employer.company_name}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {employer.relationship_type.replace("_", " ")} ·{" "}
          {employer.commission_rate
            ? `${(employer.commission_rate * 100).toFixed(1)}% commission`
            : "no commission rate set"}
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">Edit</h2>
        <div className="border border-border bg-card p-5">
          <EmployerForm employer={employer} />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-medium text-sm">
            Jobs ({jobs?.length ?? 0})
          </h2>
          <ul className="divide-y divide-border border border-border bg-card text-sm">
            {(jobs ?? []).map((j) => (
              <li
                className="flex items-center justify-between gap-3 px-3 py-2"
                key={j.id}
              >
                <Link
                  className="hover:text-accent"
                  href={`/admin/jobs/${j.id}/edit`}
                >
                  {j.title}
                </Link>
                <span className="text-muted-foreground text-xs">
                  {j.job_tier} · {j.status}
                </span>
              </li>
            ))}
            {(!jobs || jobs.length === 0) && (
              <li className="px-3 py-3 text-center text-muted-foreground text-sm">
                None
              </li>
            )}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-medium text-sm">
            Placements ({placements?.length ?? 0})
          </h2>
          <ul className="divide-y divide-border border border-border bg-card text-sm">
            {(placements ?? []).map((p) => (
              <li
                className="flex items-center justify-between gap-3 px-3 py-2"
                key={p.id}
              >
                <span>{new Date(p.placed_at).toLocaleDateString()}</span>
                <span className="text-muted-foreground text-xs">
                  {p.fee_amount
                    ? `$${(p.fee_amount / 100).toLocaleString()}`
                    : "—"}{" "}
                  · {p.status}
                </span>
              </li>
            ))}
            {(!placements || placements.length === 0) && (
              <li className="px-3 py-3 text-center text-muted-foreground text-sm">
                None
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

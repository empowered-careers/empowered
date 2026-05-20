import Link from "next/link";

import { EmployerForm } from "@/components/admin/employer-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin · Employers",
  robots: { index: false, follow: false },
};

export default async function AdminEmployersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employers")
    .select(
      "id, company_name, contact_name, contact_email, relationship_type, commission_rate, created_at"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-10 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Employers
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {data?.length ?? 0} on file. Direct clients keep 100% of fees; agency
          partners trigger commission rows on placement.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">New employer</h2>
        <div className="border border-border bg-card p-5">
          <EmployerForm />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">All employers</h2>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Relationship</th>
                <th className="px-4 py-2 font-medium">Rate</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((e) => (
                <tr className="border-t border-border" key={e.id}>
                  <td className="px-4 py-2">{e.company_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {e.contact_name} · {e.contact_email}
                  </td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">
                    {e.relationship_type.replace("_", " ")}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {e.commission_rate
                      ? `${(e.commission_rate * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      className="text-accent hover:underline"
                      href={`/admin/employers/${e.id}`}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {(!data || data.length === 0) && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    No employers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

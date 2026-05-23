import Link from "next/link";

import { ClientCompanyForm } from "@/components/employer/client-company-form";
import { requireEmployer } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Employer · Clients",
  robots: { index: false, follow: false },
};

export default async function EmployerClientsPage() {
  const { employerId, relationshipType } = await requireEmployer();

  if (!employerId) {
    return (
      <div className="space-y-6 px-10 py-8">
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Clients
        </h1>
        <p className="text-muted-foreground text-sm">
          Admin impersonation: clients live under each agency&apos;s employer
          row. Inspect from{" "}
          <Link className="underline" href="/admin/employers">
            /admin/employers
          </Link>
          .
        </p>
      </div>
    );
  }

  if (relationshipType !== "agency_partner") {
    return (
      <div className="space-y-6 px-10 py-8">
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Clients
        </h1>
        <p className="text-muted-foreground text-sm">
          This section is for agency partners — you post roles for many
          end-client companies. Direct-client accounts post for themselves and
          don&apos;t need this view.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("client_companies")
    .select("id, name, contact_name, contact_email, created_at")
    .eq("agency_employer_id", employerId)
    .order("name");
  const clients = data ?? [];

  return (
    <div className="space-y-10 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Clients
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          End-client companies you post roles for. Names are private to your
          agency — adding a client here doesn&apos;t create a row in any other
          agency&apos;s portal.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">Add a client</h2>
        <div className="border border-border bg-card p-5">
          <ClientCompanyForm />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-sm">
          Your clients ({clients.length})
        </h2>
        <div className="overflow-hidden border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Added</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {c.contact_name ?? "—"}
                    {c.contact_email ? ` · ${c.contact_email}` : ""}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/employer/clients/${c.id}`}
                      className="text-accent hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No clients yet. Add one above to start posting roles.
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

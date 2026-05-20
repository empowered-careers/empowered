import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin · Overview",
  robots: { index: false, follow: false },
};

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

interface TileProps {
  label: string;
  value: string | number;
  href?: string;
  sub?: string;
}

function Tile({ label, value, href, sub }: TileProps) {
  const body = (
    <div className="h-full border border-border bg-card p-5 transition-colors hover:border-accent/60">
      <div className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-2 font-display font-medium text-3xl tracking-tight">
        {value}
      </div>
      {sub && <div className="mt-1 text-muted-foreground text-xs">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const monthStart = startOfMonthIso();

  const [
    { data: candidates },
    { data: jobs },
    { data: applications },
    { count: placementsMtd },
    { data: outstandingCommissions },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, subscription_status")
      .eq("role", "candidate"),
    supabase.from("jobs").select("job_tier, status").eq("status", "active"),
    supabase.from("applications").select("status"),
    supabase
      .from("placements")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("commissions")
      .select("amount_cents, status")
      .in("status", ["pending", "invoiced"]),
  ]);

  const totalCandidates = candidates?.length ?? 0;
  const paidCandidates =
    candidates?.filter(
      (c) => c.plan !== "free" && c.subscription_status === "active"
    ).length ?? 0;
  const freeCandidates = totalCandidates - paidCandidates;

  const tierCounts = { tier_1: 0, tier_2: 0, tier_3: 0 } as Record<
    string,
    number
  >;
  for (const j of jobs ?? []) tierCounts[j.job_tier] += 1;

  const appCounts: Record<string, number> = {};
  for (const a of applications ?? []) {
    appCounts[a.status] = (appCounts[a.status] ?? 0) + 1;
  }
  const activePipeline =
    (appCounts.interested ?? 0) +
    (appCounts.submitted ?? 0) +
    (appCounts.screening ?? 0) +
    (appCounts.interviewing ?? 0) +
    (appCounts.offer ?? 0);

  const outstandingCents =
    outstandingCommissions?.reduce((sum, c) => sum + c.amount_cents, 0) ?? 0;

  return (
    <div className="space-y-8 px-10 py-8">
      <section>
        <h1 className="font-display font-medium text-2xl tracking-tight">
          Overview
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Snapshot of the network — click any tile to drill in.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          href="/admin/candidates"
          label="Candidates"
          sub={`${paidCandidates} paid · ${freeCandidates} free`}
          value={totalCandidates}
        />
        <Tile
          href="/admin/jobs"
          label="Open roles"
          sub={`T1 ${tierCounts.tier_1} · T2 ${tierCounts.tier_2} · T3 ${tierCounts.tier_3}`}
          value={jobs?.length ?? 0}
        />
        <Tile
          href="/admin/applications"
          label="Active pipeline"
          sub={`${appCounts.offer ?? 0} at offer · ${appCounts.interviewing ?? 0} interviewing`}
          value={activePipeline}
        />
        <Tile
          href="/admin/placements"
          label="Placements MTD"
          sub={`${appCounts.placed ?? 0} placed all-time`}
          value={placementsMtd ?? 0}
        />
        <Tile
          href="/admin/commissions"
          label="Commission outstanding"
          sub={`${outstandingCommissions?.length ?? 0} unpaid invoice${
            outstandingCommissions?.length === 1 ? "" : "s"
          }`}
          value={formatCurrency(outstandingCents)}
        />
        <Tile
          href="/admin/payments"
          label="Payments ledger"
          sub="Stripe + manual Plan 3 grants"
          value="→"
        />
      </section>
    </div>
  );
}

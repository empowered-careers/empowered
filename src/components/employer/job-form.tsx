"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { archiveJob, createJob, updateJob } from "@/app/actions/employer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { JobRow, RemotePolicy } from "@/types/db";

const REMOTE: { value: RemotePolicy; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];

const labelCls = "mb-1 block text-[12px] font-medium text-muted-foreground";
const selectCls = cn(
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition-[color,box-shadow]",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

export interface ClientCompanyOption {
  id: string;
  name: string;
}

export function EmployerJobForm({
  job,
  isAgency,
  clientCompanies,
}: {
  job?: JobRow;
  isAgency: boolean;
  clientCompanies: ClientCompanyOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = !!job;

  const [form, setForm] = useState({
    title: job?.title ?? "",
    company_name: job?.company_name ?? "",
    location: job?.location ?? "",
    remote_policy: (job?.remote_policy ?? "remote") as RemotePolicy,
    salary_min: job?.salary_min?.toString() ?? "",
    salary_max: job?.salary_max?.toString() ?? "",
    description: job?.description ?? "",
    client_company_id: job?.client_company_id ?? "",
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.company_name.trim()) {
      toast.error("Title and company are required.");
      return;
    }
    if (isAgency && !form.client_company_id) {
      toast.error("Pick a client for this role.");
      return;
    }
    const payload = {
      title: form.title.trim(),
      company_name: form.company_name.trim(),
      location: form.location.trim() || null,
      remote_policy: form.remote_policy,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      description: form.description.trim() || null,
      client_company_id: isAgency ? form.client_company_id || null : null,
    };

    startTransition(async () => {
      const result = editing
        ? await updateJob(job!.id, payload)
        : await createJob(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Role updated." : "Role posted.");
      router.push("/employer/jobs");
      router.refresh();
    });
  };

  const handleArchive = () => {
    if (!job) return;
    startTransition(async () => {
      const result = await archiveJob(job.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Role archived.");
      router.push("/employer/jobs");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {isAgency && (
          <div className="md:col-span-2">
            <label htmlFor="client_company_id" className={labelCls}>
              Client
            </label>
            <select
              id="client_company_id"
              className={selectCls}
              value={form.client_company_id}
              onChange={(e) => update("client_company_id", e.target.value)}
              required
            >
              <option value="">Select a client…</option>
              {clientCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {clientCompanies.length === 0 && (
              <p className="mt-1 text-[12px] text-muted-foreground">
                You haven&apos;t added any clients yet. Add one from{" "}
                <Link className="underline" href="/employer/clients">
                  Clients
                </Link>{" "}
                first.
              </p>
            )}
          </div>
        )}
        <div>
          <label htmlFor="title" className={labelCls}>
            Title
          </label>
          <Input
            id="title"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="company_name" className={labelCls}>
            Company
          </label>
          <Input
            id="company_name"
            required
            value={form.company_name}
            onChange={(e) => update("company_name", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="location" className={labelCls}>
            Location
          </label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="e.g. NYC, Remote (US)"
          />
        </div>
        <div>
          <label htmlFor="remote_policy" className={labelCls}>
            Remote policy
          </label>
          <select
            id="remote_policy"
            className={selectCls}
            value={form.remote_policy}
            onChange={(e) =>
              update("remote_policy", e.target.value as RemotePolicy)
            }
          >
            {REMOTE.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 md:col-span-2">
          <div>
            <label htmlFor="salary_min" className={labelCls}>
              Salary min
            </label>
            <Input
              id="salary_min"
              type="number"
              inputMode="numeric"
              value={form.salary_min}
              onChange={(e) => update("salary_min", e.target.value)}
              placeholder="200000"
            />
          </div>
          <div>
            <label htmlFor="salary_max" className={labelCls}>
              Salary max
            </label>
            <Input
              id="salary_max"
              type="number"
              inputMode="numeric"
              value={form.salary_max}
              onChange={(e) => update("salary_max", e.target.value)}
              placeholder="260000"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelCls}>
          Description
        </label>
        <textarea
          id="description"
          rows={8}
          className={cn(
            "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          )}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Role overview, key responsibilities, must-haves…"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {editing ? "Save changes" : "Post role"}
        </Button>
        {editing && job!.status === "active" && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={handleArchive}
          >
            Archive
          </Button>
        )}
      </div>
    </form>
  );
}

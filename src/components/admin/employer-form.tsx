"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createEmployer,
  type EmployerInput,
  updateEmployer,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EmployerRow, RelationshipType } from "@/types/db";

const labelCls = "mb-1 block text-[12px] font-medium text-muted-foreground";
const selectCls = cn(
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition-[color,box-shadow]",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

interface Props {
  employer?: EmployerRow;
}

export function EmployerForm({ employer }: Props) {
  const router = useRouter();
  const editing = !!employer;
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    company_name: employer?.company_name ?? "",
    contact_name: employer?.contact_name ?? "",
    contact_email: employer?.contact_email ?? "",
    relationship_type: (employer?.relationship_type ??
      "direct_client") as RelationshipType,
    commission_rate: employer?.commission_rate?.toString() ?? "",
    notes: employer?.notes ?? "",
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.company_name.trim() ||
      !form.contact_name.trim() ||
      !form.contact_email.trim()
    ) {
      toast.error("Company, contact name, and contact email are required.");
      return;
    }
    const payload: EmployerInput = {
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim(),
      contact_email: form.contact_email.trim(),
      relationship_type: form.relationship_type,
      commission_rate: form.commission_rate
        ? Number(form.commission_rate)
        : null,
      notes: form.notes.trim() || null,
    };

    startTransition(async () => {
      const result = editing
        ? await updateEmployer(employer!.id, payload)
        : await createEmployer(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Employer updated." : "Employer created.");
      router.push("/admin/employers");
      router.refresh();
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="company_name">
            Company
          </label>
          <Input
            id="company_name"
            onChange={(e) => update("company_name", e.target.value)}
            required
            value={form.company_name}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="relationship_type">
            Relationship
          </label>
          <select
            className={selectCls}
            id="relationship_type"
            onChange={(e) =>
              update("relationship_type", e.target.value as RelationshipType)
            }
            value={form.relationship_type}
          >
            <option value="direct_client">Direct client</option>
            <option value="agency_partner">Agency partner</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="contact_name">
            Contact name
          </label>
          <Input
            id="contact_name"
            onChange={(e) => update("contact_name", e.target.value)}
            required
            value={form.contact_name}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="contact_email">
            Contact email
          </label>
          <Input
            id="contact_email"
            onChange={(e) => update("contact_email", e.target.value)}
            required
            type="email"
            value={form.contact_email}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="commission_rate">
            Commission rate (0–1)
          </label>
          <Input
            id="commission_rate"
            inputMode="decimal"
            onChange={(e) => update("commission_rate", e.target.value)}
            placeholder="0.20"
            type="number"
            value={form.commission_rate}
          />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="notes">
          Notes
        </label>
        <textarea
          className={cn(
            "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          )}
          id="notes"
          onChange={(e) => update("notes", e.target.value)}
          rows={4}
          value={form.notes ?? ""}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button disabled={pending} type="submit">
          {editing ? "Save changes" : "Create employer"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createClientCompany,
  deleteClientCompany,
  updateClientCompany,
} from "@/app/actions/employer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const labelCls = "mb-1 block text-[12px] font-medium text-muted-foreground";

interface ClientCompanyFormValues {
  id?: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
}

export function ClientCompanyForm({
  client,
  onSaved,
}: {
  client?: ClientCompanyFormValues;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = !!client?.id;

  const [form, setForm] = useState({
    name: client?.name ?? "",
    contact_name: client?.contact_name ?? "",
    contact_email: client?.contact_email ?? "",
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim() || null,
    };

    startTransition(async () => {
      const result =
        editing && client?.id
          ? await updateClientCompany(client.id, payload)
          : await createClientCompany(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Client updated." : "Client added.");
      if (!editing) {
        setForm({ name: "", contact_name: "", contact_email: "" });
      }
      onSaved?.();
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!client?.id) return;
    if (
      !confirm(
        `Delete "${client.name}"? Jobs posted for this client will keep their history but lose the client label.`
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteClientCompany(client.id!);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Client deleted.");
      router.push("/employer/clients");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label htmlFor="cc-name" className={labelCls}>
            Client name
          </label>
          <Input
            id="cc-name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Acme Corp"
          />
        </div>
        <div>
          <label htmlFor="cc-contact-name" className={labelCls}>
            Contact name
          </label>
          <Input
            id="cc-contact-name"
            value={form.contact_name}
            onChange={(e) => update("contact_name", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="cc-contact-email" className={labelCls}>
            Contact email
          </label>
          <Input
            id="cc-contact-email"
            type="email"
            value={form.contact_email}
            onChange={(e) => update("contact_email", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {editing ? "Save changes" : "Add client"}
        </Button>
        {editing && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={handleDelete}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}

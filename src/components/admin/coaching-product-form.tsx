"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  type CoachingProductInput,
  createCoachingProduct,
  updateCoachingProduct,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type {
  CoachingProductRow,
  CoachingProductType as ProductType,
} from "@/types/db";

const TYPES: { value: ProductType; label: string }[] = [
  { value: "module", label: "Module" },
  { value: "session_pack", label: "Session pack" },
  { value: "one_to_one", label: "One-to-one" },
];

const labelCls = "mb-1 block text-[12px] font-medium text-muted-foreground";
const selectCls = cn(
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition-[color,box-shadow]",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

interface Props {
  product?: CoachingProductRow;
}

export function CoachingProductForm({ product }: Props) {
  const router = useRouter();
  const editing = !!product;
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: product?.name ?? "",
    type: (product?.type ?? "module") as ProductType,
    description: product?.description ?? "",
    price_dollars:
      product?.price_cents != null
        ? (product.price_cents / 100).toString()
        : "",
    external_url: product?.external_url ?? "",
    is_active: product?.is_active ?? true,
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    const payload: CoachingProductInput = {
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || null,
      price_cents: form.price_dollars
        ? Math.round(Number(form.price_dollars) * 100)
        : null,
      external_url: form.external_url.trim() || null,
      is_active: form.is_active,
    };

    startTransition(async () => {
      const result = editing
        ? await updateCoachingProduct(product!.id, payload)
        : await createCoachingProduct(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (editing) {
        toast.success("Product updated.");
        router.push("/admin/coaching");
        router.refresh();
        return;
      }
      toast.success("Product created.");
      setForm({
        name: "",
        type: "module",
        description: "",
        price_dollars: "",
        external_url: "",
        is_active: true,
      });
      router.refresh();
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="name">
            Name
          </label>
          <Input
            id="name"
            onChange={(e) => update("name", e.target.value)}
            required
            value={form.name}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="type">
            Type
          </label>
          <select
            className={selectCls}
            id="type"
            onChange={(e) => update("type", e.target.value as ProductType)}
            value={form.type}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="price_dollars">
            Price (USD)
          </label>
          <Input
            id="price_dollars"
            inputMode="decimal"
            onChange={(e) => update("price_dollars", e.target.value)}
            placeholder="500"
            type="number"
            value={form.price_dollars}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="external_url">
            External URL
          </label>
          <Input
            id="external_url"
            onChange={(e) => update("external_url", e.target.value)}
            placeholder="https://…"
            value={form.external_url}
          />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="description">
          Description
        </label>
        <textarea
          className={cn(
            "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          )}
          id="description"
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          value={form.description}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={form.is_active}
          id="is-active"
          onCheckedChange={(checked) => update("is_active", checked)}
        />
        <label className="text-sm" htmlFor="is-active">
          Active
        </label>
      </div>

      <Button disabled={pending} type="submit">
        {editing
          ? pending
            ? "Saving…"
            : "Save changes"
          : pending
            ? "Creating…"
            : "Create product"}
      </Button>
    </form>
  );
}

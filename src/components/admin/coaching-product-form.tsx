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
  CoachingProductKind,
  CoachingProductRow,
  CoachRow,
} from "@/types/db";

const KINDS: { value: CoachingProductKind; label: string }[] = [
  { value: "session", label: "Session" },
  { value: "bundle", label: "Bundle" },
  { value: "course", label: "Course" },
  { value: "service", label: "Service" },
];

const labelCls = "mb-1 block text-[12px] font-medium text-muted-foreground";
const selectCls = cn(
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition-[color,box-shadow]",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

const EMPTY = {
  name: "",
  kind: "session" as CoachingProductKind,
  description: "",
  price_dollars: "",
  stripe_price_id: "",
  external_url: "",
  booking_url: "",
  coach_id: "",
  is_active: true,
};

interface Props {
  product?: CoachingProductRow;
  coaches: Pick<CoachRow, "id" | "name">[];
}

export function CoachingProductForm({ product, coaches }: Props) {
  const router = useRouter();
  const editing = !!product;
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    ...EMPTY,
    name: product?.name ?? "",
    kind: (product?.kind ?? "session") as CoachingProductKind,
    description: product?.description ?? "",
    price_dollars:
      product?.price_cents != null
        ? (product.price_cents / 100).toString()
        : "",
    stripe_price_id: product?.stripe_price_id ?? "",
    external_url: product?.external_url ?? "",
    booking_url: product?.booking_url ?? "",
    coach_id: product?.coach_id ?? "",
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
      kind: form.kind,
      description: form.description.trim() || null,
      price_cents: form.price_dollars
        ? Math.round(Number(form.price_dollars) * 100)
        : null,
      stripe_price_id: form.stripe_price_id.trim() || null,
      external_url: form.external_url.trim() || null,
      booking_url: form.booking_url.trim() || null,
      coach_id: form.coach_id || null,
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
      setForm(EMPTY);
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
          <label className={labelCls} htmlFor="kind">
            Kind
          </label>
          <select
            className={selectCls}
            id="kind"
            onChange={(e) =>
              update("kind", e.target.value as CoachingProductKind)
            }
            value={form.kind}
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
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
          <label className={labelCls} htmlFor="stripe_price_id">
            Stripe price ID
          </label>
          <Input
            id="stripe_price_id"
            onChange={(e) => update("stripe_price_id", e.target.value)}
            placeholder="price_…"
            value={form.stripe_price_id}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Not purchasable until this is set.
          </p>
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
          <p className="mt-1 text-[11px] text-muted-foreground">
            Course video embed, for kind = course.
          </p>
        </div>
        {form.kind === "session" && (
          <>
            <div>
              <label className={labelCls} htmlFor="booking_url">
                Booking URL
              </label>
              <Input
                id="booking_url"
                onChange={(e) => update("booking_url", e.target.value)}
                placeholder="https://cal.com/…"
                value={form.booking_url}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="coach_id">
                Coach
              </label>
              <select
                className={selectCls}
                id="coach_id"
                onChange={(e) => update("coach_id", e.target.value)}
                value={form.coach_id}
              >
                <option value="">— none —</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
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

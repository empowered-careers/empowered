"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";

type PaymentRowPartial = {
  id: string;
  profile_id: string;
  status: string | null;
  product_type: string | null;
  billing_reason: string | null;
};

/**
 * Realtime payment confirmation. The Stripe webhook inserts a `payments` row
 * (status = 'succeeded') for every confirmed charge — subscription create,
 * renewal, and à la carte one-time. This hook catches that INSERT over
 * Realtime and surfaces a toast + cache invalidation, so a candidate who stays
 * on the site gets instant confirmation rather than waiting on the
 * `/checkout/success` poll (which remains the fallback for the redirect flow).
 */
export function usePaymentNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`payments-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payments",
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as PaymentRowPartial;
          if (row.status !== "succeeded") return;

          // Renewals fire in the background and aren't tied to an active
          // checkout — invalidate quietly without a surprise toast.
          if (row.billing_reason !== "subscription_cycle") {
            const isSubscription = row.product_type === "subscription";
            toast.success(
              isSubscription ? "Subscription active" : "Payment confirmed",
              {
                description: isSubscription
                  ? "Your membership is live — exclusive roles are unlocked."
                  : "Your purchase is confirmed.",
                action: {
                  label: "View",
                  onClick: () => router.push("/billing"),
                },
              }
            );
          }

          queryClient.invalidateQueries({
            queryKey: queryKeys.billing.plan(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.billing.payments(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.dashboard.byUser(user.id),
          });
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, queryClient, router]);
}

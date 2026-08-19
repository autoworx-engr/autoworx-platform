"use client";

import { useState, useTransition } from "react";

export function ForceCancelSubscriptionButton({
  companyId,
  hasCancellableStripeSubscription,
}: {
  companyId: number;
  hasCancellableStripeSubscription: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [cancelled, setCancelled] = useState(false);

  if (!hasCancellableStripeSubscription || cancelled) return null;

  const handleClick = () => {
    if (
      !window.confirm(
        "Immediately cancel this company's Stripe subscription? Access ends right now — unlike the owner-facing cancel, this cannot be undone.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/awx/force-cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) setCancelled(true);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
    >
      {isPending ? "Cancelling..." : "Force Cancel Subscription"}
    </button>
  );
}

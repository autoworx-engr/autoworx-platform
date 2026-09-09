"use client";

import {
  cancelSubscription,
  resumePlatformSubscription,
} from "@/actions/platform-billing/cancel";
import { createPlatformBillingPortal } from "@/actions/platform-billing/portal";
import { PlatformSubscriptionStatus } from "@prisma/client";
import { Award, CreditCard, Loader2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";

type SubscriptionActionsProps = {
  companyId: number;
  status: PlatformSubscriptionStatus | "NONE";
  hasStripeSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  onUpgradeClick: () => void;
};

export function SubscriptionActions({
  companyId,
  status,
  hasStripeSubscription,
  cancelAtPeriodEnd,
  onUpgradeClick,
}: SubscriptionActionsProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // A pre-migration row can carry a live status with no Stripe subscription
  // behind it. Cancel and Manage Billing both need one, so offering them would
  // be a dead end — send those companies to checkout instead, which creates the
  // real subscription and repairs the row.
  const isLive =
    hasStripeSubscription &&
    (status === PlatformSubscriptionStatus.ACTIVE ||
      status === PlatformSubscriptionStatus.PAST_DUE ||
      status === PlatformSubscriptionStatus.TRIALING);

  const handleCancel = async () => {
    if (
      !window.confirm(
        "Cancel your subscription? You'll keep access until the end of your current billing period, and can undo this any time before then.",
      )
    )
      return;

    setIsCancelling(true);
    const res = await cancelSubscription(companyId);
    if (res.success) {
      toast.success(
        "Your subscription will end at the close of the current billing period",
      );
      window.location.reload();
    } else {
      toast.error(res.message);
    }
    setIsCancelling(false);
  };

  const handleResume = async () => {
    setIsResuming(true);
    const res = await resumePlatformSubscription(companyId);
    if (res.success) {
      toast.success("Subscription resumed");
      window.location.reload();
    } else {
      toast.error(res.message);
    }
    setIsResuming(false);
  };

  const handleManageBilling = async () => {
    setIsOpeningPortal(true);
    const res = await createPlatformBillingPortal(companyId);
    if (res.success && res.url) {
      window.location.href = res.url;
    } else {
      toast.error(res.message || "Failed to open billing portal");
      setIsOpeningPortal(false);
    }
  };

  if (!isLive) {
    return (
      <button
        className="h-11 w-full rounded-lg bg-primary text-base font-bold text-white shadow-md hover:bg-[#525fec] transition sm:w-48"
        onClick={onUpgradeClick}
      >
        Choose a Plan
      </button>
    );
  }

  return (
    <div className="flex flex-col space-y-3 sm:flex-row sm:flex-wrap sm:gap-3 sm:space-y-0">
      {cancelAtPeriodEnd ? (
        <button
          className="h-11 w-full rounded-lg border border-emerald-200 bg-emerald-50 text-base font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 transition sm:w-44 disabled:opacity-50"
          onClick={handleResume}
          disabled={isResuming}
        >
          {isResuming ? (
            <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
          ) : (
            <Undo2 className="w-4 h-4 inline mr-1" />
          )}
          Resume Plan
        </button>
      ) : (
        <button
          className="h-11 w-full rounded-lg border border-red-200 bg-red-50 text-base font-semibold text-red-600 shadow-sm hover:bg-red-100 transition sm:w-32 disabled:opacity-50"
          onClick={handleCancel}
          disabled={isCancelling}
        >
          {isCancelling ? (
            <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
          ) : null}
          Cancel Plan
        </button>
      )}
      <button
        className="h-11 w-full rounded-lg bg-primary text-base font-bold text-white shadow-md hover:bg-[#525fec] transition sm:w-36"
        onClick={onUpgradeClick}
      >
        <Award className="w-5 h-5 inline mr-1" />
        Upgrade
      </button>
      <button
        className="h-11 w-full rounded-lg border border-gray-200 bg-white text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition sm:w-44 disabled:opacity-50"
        onClick={handleManageBilling}
        disabled={isOpeningPortal}
      >
        {isOpeningPortal ? (
          <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
        ) : (
          <CreditCard className="w-4 h-4 inline mr-1" />
        )}
        Manage Billing
      </button>
    </div>
  );
}

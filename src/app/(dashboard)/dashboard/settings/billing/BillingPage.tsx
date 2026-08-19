"use client";

import { createPlatformCheckout } from "@/actions/platform-billing/checkout";
import { changePlatformPlan } from "@/actions/platform-billing/changePlan";
import {
  getCurrentSubscription,
  getPlatformPlans,
} from "@/actions/platform-billing/plans";
import { CheckoutForm } from "@/components/platform-billing/CheckoutForm";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { PlatformSubscriptionStatus } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { PaymentHistoryTable } from "./PaymentHistoryTable";
import { PricePlans } from "./PricePlans";
import { SubscriptionDetailsCard } from "./SubscriptionDetailsCard";

export default function Page() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [plansOpen, setPlansOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] =
    useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const timezone = useCompanyTimezone();

  // Auto-open the plans modal when redirected from an upgrade prompt
  useEffect(() => {
    if (!loading && searchParams.get("showPlans") === "true") {
      setPlansOpen(true);
    }
  }, [loading, searchParams]);

  // Stripe redirects back here after Checkout. The subscription itself is
  // set up by the webhook shortly after, not by this redirect — give it a
  // moment before reloading so the page picks up the synced state.
  useEffect(() => {
    const checkoutResult = searchParams.get("checkout");
    if (checkoutResult === "success") {
      toast.success("Payment received — setting up your subscription...");
      const timer = setTimeout(
        () => window.location.replace("/dashboard/settings/billing"),
        2500,
      );
      return () => clearTimeout(timer);
    }
    if (checkoutResult === "cancelled") {
      toast.error("Checkout cancelled — no changes were made");
      window.history.replaceState(null, "", "/dashboard/settings/billing");
    }
  }, [searchParams]);

  useEffect(() => {
    async function init() {
      const [plansRes, subRes] = await Promise.all([
        session?.user?.companyId
          ? getPlatformPlans(session.user.companyId)
          : getPlatformPlans(),
        session?.user?.companyId
          ? getCurrentSubscription(session.user.companyId)
          : Promise.resolve({ success: false, data: null }),
      ]);

      if (plansRes.success) setPlans(plansRes.data || []);
      if (subRes.success) setSubscription(subRes.data);
      setLoading(false);
    }
    if (session?.user?.id) init();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlan = subscription?.plan || null;
  const subStatus =
    (subscription?.status as PlatformSubscriptionStatus) || "NONE";
  const currentPlanName = currentPlan?.name || "No Active Plan";

  const currentPlanIdForModal =
    subStatus === PlatformSubscriptionStatus.ACTIVE ||
    subStatus === PlatformSubscriptionStatus.PAST_DUE ||
    subStatus === PlatformSubscriptionStatus.TRIALING
      ? currentPlan?.id
      : null;

  const isLiveStripeSub =
    !!subscription?.stripeSubscriptionId &&
    (subStatus === PlatformSubscriptionStatus.ACTIVE ||
      subStatus === PlatformSubscriptionStatus.PAST_DUE ||
      subStatus === PlatformSubscriptionStatus.TRIALING);

  const handlePlanSelect = async (plan: any) => {
    setPlansOpen(false);

    // Already on a live Stripe subscription — swap the plan in place with
    // Stripe's own proration, no card re-entry.
    if (isLiveStripeSub) {
      setIsChangingPlan(true);
      const res = await changePlatformPlan(session!.user.companyId, plan.id);
      if (res.success) {
        toast.success("Plan changed successfully");
        window.location.reload();
      } else {
        toast.error(res.message);
        setIsChangingPlan(false);
      }
      return;
    }

    // Plan is synced to Stripe and there's no legacy Authorize.Net
    // subscription to migrate — go straight to Stripe Checkout.
    if (plan.stripePriceId && !subscription?.authNetSubscriptionId) {
      setIsChangingPlan(true);
      const res = await createPlatformCheckout({
        companyId: session!.user.companyId,
        planId: plan.id,
        email: session!.user.email,
      });
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        toast.error(res.message || "Failed to start checkout");
        setIsChangingPlan(false);
      }
      return;
    }

    // Fallback: legacy Authorize.Net card-entry modal.
    setSelectedPlanForCheckout(plan);
  };

  return (
    <div className="min-h-screen ">
      <div className="relative  flex max-w-4xl flex-col space-y-8 p-2">
        <SubscriptionDetailsCard
          companyId={session!.user.companyId}
          subscription={subscription}
          subStatus={subStatus}
          currentPlanName={currentPlanName}
          logoIndex={plans.findIndex((p) => p.id === currentPlan?.id)}
          onUpgradeClick={() => setPlansOpen(true)}
        />

        <PaymentHistoryTable
          invoices={subscription?.billingCustomer?.invoices || []}
          timezone={timezone}
        />
      </div>

      {plansOpen && (
        <PricePlans
          plans={plans}
          onPlanSelect={handlePlanSelect}
          setClose={() => setPlansOpen(false)}
          currentPlanId={currentPlanIdForModal}
        />
      )}

      {selectedPlanForCheckout && (
        <section className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <CheckoutForm
            plan={selectedPlanForCheckout}
            companyId={session!.user.companyId}
            email={session!.user.email}
            onCancel={() => setSelectedPlanForCheckout(null)}
            onSuccess={() => {
              setSelectedPlanForCheckout(null);
              window.location.reload();
            }}
          />
        </section>
      )}

      {isChangingPlan && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 shadow-xl">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-gray-700">
              Updating your plan...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

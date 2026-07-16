"use client";

import { cancelSubscription } from "@/actions/platform-billing/cancel";
import {
  getCurrentSubscription,
  getPlatformPlans,
} from "@/actions/platform-billing/plans";
import { CheckoutForm } from "@/components/platform-billing/CheckoutForm";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { PlatformSubscriptionStatus } from "@prisma/client";
import { Award, History, Loader2, Zap } from "lucide-react";
import moment from "moment-timezone";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { PricePlans } from "./PricePlans";

const planColors: { [key: string]: string } = {
  "Starter (Text Only)": "text-gray-500",
  "Starter (Call + Text)": "text-primary",
  Growth: "text-primary",
  Scale: "text-yellow-500",
};

export default function Page() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [plansOpen, setPlansOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] =
    useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const timezone = useCompanyTimezone();

  // Auto-open the plans modal when redirected from an upgrade prompt
  useEffect(() => {
    if (!loading && searchParams.get("showPlans") === "true") {
      setPlansOpen(true);
    }
  }, [loading, searchParams]);

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
    subStatus === PlatformSubscriptionStatus.PAST_DUE
      ? currentPlan?.id
      : null;

  const handleCancelClick = async () => {
    if (
      !window.confirm(
        "Are you sure you want to cancel your subscription? This will immediately revoke access to plan features.",
      )
    ) {
      return;
    }

    setIsCancelling(true);
    const res = await cancelSubscription(session!.user.companyId);
    if (res.success) {
      toast.success("Subscription cancelled successfully");
      window.location.reload();
    } else {
      toast.error(res.message);
    }
    setIsCancelling(false);
  };

  return (
    <div className="min-h-screen ">
      <div className="relative  flex max-w-4xl flex-col space-y-8 p-2">
        {/* Subscription Section */}
        <div className="w-full">
          <h2 className="mb-4 flex items-center text-2xl font-bold ">
            <Zap className="w-6 h-6 mr-2 text-primary" />
            Subscription Details
          </h2>
          <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-xl lg:flex-row">
            <div className="flex-1 space-y-3 lg:space-y-4">
              <p className="text-lg font-semibold leading-7 text-gray-700 sm:text-xl">
                Current Plan:{" "}
                <span
                  className={`text-2xl font-extrabold ${
                    planColors[currentPlanName] || "text-gray-500"
                  }`}
                >
                  {currentPlanName}
                </span>
                {subStatus !== PlatformSubscriptionStatus.ACTIVE &&
                  subStatus !== ("NONE" as any) && (
                    <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">
                      {subStatus}
                    </span>
                  )}
              </p>
              <div className="space-y-1 text-base font-normal text-gray-600">
                {subscription ? (
                  <>
                    <p>
                      Activated on:{" "}
                      <span className="font-semibold text-gray-800">
                        {moment(subscription.currentPeriodStart).format(
                          "Do MMMM YYYY",
                        )}
                      </span>
                    </p>
                    <p>
                      Next Billing:{" "}
                      <span
                        className={`font-semibold ${subStatus === PlatformSubscriptionStatus.PAST_DUE ? "text-red-500" : "text-gray-800"}`}
                      >
                        {subscription.currentPeriodEnd
                          ? moment(subscription.currentPeriodEnd).format(
                              "Do MMMM YYYY",
                            )
                          : "N/A"}
                      </span>
                    </p>
                  </>
                ) : (
                  <p>You don't have an active subscription yet.</p>
                )}
              </div>

              <div className="mt-8 flex flex-col space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0 lg:mt-10">
                {subStatus === "ACTIVE" || subStatus === "PAST_DUE" ? (
                  <>
                    <button
                      className="h-11 w-full rounded-lg border border-red-200 bg-red-50 text-base font-semibold text-red-600 shadow-sm hover:bg-red-100 transition sm:w-32 lg:w-40 disabled:opacity-50"
                      onClick={handleCancelClick}
                      disabled={isCancelling}
                    >
                      {isCancelling ? (
                        <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                      ) : null}
                      Cancel Plan
                    </button>
                    <button
                      className="h-11 w-full rounded-lg bg-primary text-base font-bold text-white shadow-md hover:bg-[#525fec] transition sm:w-36 lg:w-40"
                      onClick={() => setPlansOpen(true)}
                    >
                      <Award className="w-5 h-5 inline mr-1" />
                      Upgrade
                    </button>
                  </>
                ) : (
                  <button
                    className="h-11 w-full rounded-lg bg-primary text-base font-bold text-white shadow-md hover:bg-[#525fec] transition sm:w-48"
                    onClick={() => setPlansOpen(true)}
                  >
                    Choose a Plan
                  </button>
                )}
              </div>
              <p className="mt-4 text-xs font-normal italic leading-4 text-gray-500 pt-2">
                If you want a package customized according to your preferences,{" "}
                <br />
                contact us here at <i>admin@autoworx.tech</i>
              </p>
            </div>
            {/* Icon section */}
            <div className="flex justify-center lg:justify-end lg:items-center">
              <Image
                src={`/icons/CompanyLogo${
                  (Math.max(
                    0,
                    plans.findIndex((p) => p.id === currentPlan?.id),
                  ) %
                    3) +
                  1
                }.svg`}
                width={150}
                height={150}
                alt="Company logo"
                className="h-32 w-32 sm:h-40 sm:w-40 lg:h-48 lg:w-48 opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Payment History Section */}
        <div className="w-full">
          <h2 className="mb-4 flex items-center text-2xl font-bold ">
            <History className="w-6 h-6 mr-2 text-primary" />
            Payment History
          </h2>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr className="sticky top-0 text-left text-sm font-bold uppercase tracking-wider text-gray-600 bg-white">
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
                {subscription?.billingCustomer?.invoices?.length > 0 ? (
                  subscription.billingCustomer.invoices.map(
                    (inv: any, index: number) => (
                      <tr
                        key={inv.id}
                        className={
                          index % 2 === 0
                            ? "bg-white hover:bg-gray-50"
                            : "bg-blue-50 hover:bg-gray-100"
                        }
                      >
                        <td className="px-6 py-3 font-medium">${inv.amount}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${inv.status === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {moment
                            .tz(inv.createdAt, timezone)
                            .format("MM/DD/YYYY")}
                        </td>
                      </tr>
                    ),
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-10 text-center text-gray-400 italic"
                    >
                      No payment history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {plansOpen && (
        <PricePlans
          plans={plans}
          onPlanSelect={(plan) => {
            setSelectedPlanForCheckout(plan);
            setPlansOpen(false);
          }}
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
    </div>
  );
}

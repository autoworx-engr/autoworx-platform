"use client";

import { useServerGet } from "@/hooks/useServerGet";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getStripeAccount } from "./stripe";
import {
  getAuthorizeNetStatus,
  updatePaymentGateway,
  updateTipEnabled,
} from "./authorize-net";
import StripeStatus from "./StripeStatus";
import AuthorizeNetConfig from "./AuthorizeNetConfig";
import Image from "next/image";
import { CircleCheckBig, ExternalLink } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { successToast, errorToast } from "@/lib/toast";
import { getPaymentGatewayInfo } from "./getPaymentGatewayInfo";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#6571ff] focus:ring-offset-2 ${
        checked ? "bg-[#6571ff]" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function PaymentsPage() {
  const { data: session } = useSession();
  // @ts-ignore
  const companyId = session?.user?.companyId;

  const { data: stripeData, loading: stripeLoading } = useServerGet(
    getStripeAccount,
    companyId,
  );
  const { data: authorizeNetData, loading: authorizeNetLoading } = useServerGet(
    getAuthorizeNetStatus,
    companyId,
  );
  const { data: paymentGatewayInfo } = useServerGet(
    getPaymentGatewayInfo,
    companyId,
  );

  const [selectedGateway, setSelectedGateway] = useState<string>(
    paymentGatewayInfo?.paymentGateway || "STRIPE",
  );
  const [tipEnabled, setTipEnabled] = useState(
    paymentGatewayInfo?.tipEnabled ?? false,
  );

  useEffect(() => {
    if (paymentGatewayInfo?.paymentGateway) {
      setSelectedGateway(paymentGatewayInfo.paymentGateway);
    }
    if (paymentGatewayInfo?.tipEnabled !== undefined) {
      setTipEnabled(paymentGatewayInfo.tipEnabled);
    }
  }, [paymentGatewayInfo]);

  const handleGatewayChange = async (value: string) => {
    setSelectedGateway(value);
    if (companyId) {
      const result = await updatePaymentGateway(
        companyId,
        value as "STRIPE" | "AUTHORIZE_NET" | "BOTH",
      );
      if (result.success) {
        successToast("Payment gateway updated");
      } else {
        errorToast(result.message || "Failed to update payment gateway");
      }
    }
  };

  const handleTipToggle = async () => {
    const newValue = !tipEnabled;
    setTipEnabled(newValue);
    if (companyId) {
      const result = await updateTipEnabled(companyId, newValue);
      if (result.success) {
        successToast(newValue ? "Tip option enabled" : "Tip option disabled");
      } else {
        setTipEnabled(!newValue);
        errorToast(result.message || "Failed to update tip setting");
      }
    }
  };

  const gatewayOptions = [
    { value: "STRIPE", label: "Stripe Only" },
    { value: "AUTHORIZE_NET", label: "Authorize.Net Only" },
    { value: "BOTH", label: "Both" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-5 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-700">Payment Integration</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Configure your payment gateways and integrations
        </p>
      </div>

      {/* Top row: Gateway + Options side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Gateway Selection */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Gateway Selection
            </h3>
          </div>
          <div className="px-4 py-3">
            <RadioGroup
              value={selectedGateway}
              onValueChange={handleGatewayChange}
              className="space-y-2"
            >
              {gatewayOptions.map(({ value, label }) => (
                <label
                  key={value}
                  htmlFor={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    selectedGateway === value
                      ? "border-[#6571ff] bg-[#6571ff]/5"
                      : "border-gray-200 hover:border-[#6571ff]/40 hover:bg-gray-50"
                  }`}
                >
                  <RadioGroupItem value={value} id={value} />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        </div>

        {/* Payment Options */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Payment Options
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-gray-700">Enable Tips</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Let customers add a tip when paying
                </p>
              </div>
              <Toggle checked={tipEnabled} onChange={handleTipToggle} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Stripe + Authorize.Net side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Stripe */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Stripe
            </h3>
            {stripeData?.success && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600">
                <CircleCheckBig className="h-3 w-3" />
                Connected
              </span>
            )}
          </div>
          <div className="flex flex-col items-center px-4 py-5 gap-3">
            <div className="flex items-center gap-3">
              <Image src="/icons/Logo2.png" alt="Autoworx" width={32} height={32} className="h-8 w-8" />
              <span className="text-gray-300 text-lg">↔</span>
              <Image src="/icons/stripe.png" alt="Stripe" width={32} height={32} className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">Connect to Stripe</p>
              <p className="text-xs text-gray-400 mt-0.5 max-w-xs">
                Handle payments and manage revenue seamlessly
              </p>
            </div>
            <button
              onClick={() => {
                window.location.href = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID}&scope=read_write`;
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#6571ff] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#5561ef] hover:shadow-md"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {stripeData?.success ? "Reconnect" : stripeLoading ? "Loading..." : "Connect with Stripe"}
            </button>
            {stripeData?.success && <StripeStatus data={stripeData} />}
          </div>
        </div>

        {/* Authorize.Net */}
        {!authorizeNetLoading && (
          <AuthorizeNetConfig
            // @ts-ignore
            companyId={companyId || 0}
            isConfigured={authorizeNetData?.configured || false}
            hasApiLoginId={authorizeNetData?.hasApiLoginId || false}
            onUpdate={() => {}}
          />
        )}
      </div>
    </div>
  );
}

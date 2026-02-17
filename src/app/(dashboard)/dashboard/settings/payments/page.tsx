"use client";
import { useServerGet } from "@/hooks/useServerGet";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getStripeAccount } from "./stripe";
import { getAuthorizeNetStatus, updatePaymentGateway } from "./authorize-net";
import StripeStatus from "./StripeStatus";
import AuthorizeNetConfig from "./AuthorizeNetConfig";
import Image from "next/image";
import { CircleCheckBig } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { successToast, errorToast } from "@/lib/toast";
import { getPaymentGatewayInfo } from "./getPaymentGatewayInfo";

export default function PaymentsPage() {
  const { data: session } = useSession();
  const {
    data: stripeData,
    loading,
    // refetch: refetchStripe,
  } = useServerGet(
    getStripeAccount,
    // @ts-ignore
    session?.user?.companyId
  );
  const {
    data: authorizeNetData,
    loading: authorizeNetLoading,
    // refetch: refetchAuthorizeNet,
  } = useServerGet(
    getAuthorizeNetStatus,
    // @ts-ignore
    session?.user?.companyId
  );
  const {
    data: paymentGatewayInfo,
    // refetch: refetchAuthorizeNet,
  } = useServerGet(
    getPaymentGatewayInfo,
    // @ts-ignore
    session?.user?.companyId
  );

  const [isLoading, setIsLoading] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string>(
    paymentGatewayInfo?.paymentGateway || "STRIPE"
  );

  const handleGatewayChange = async (value: string) => {
    setSelectedGateway(value);
    // @ts-ignore
    const companyId = session?.user?.companyId;
    if (companyId) {
      const result = await updatePaymentGateway(
        companyId,
        value as "STRIPE" | "AUTHORIZE_NET" | "BOTH"
      );
      if (result.success) {
        successToast("Payment gateway updated successfully");
      } else {
        errorToast(result.message || "Failed to update payment gateway");
      }
    }
  };

  const handleRefresh = () => {
    // refetchStripe();
    // refetchAuthorizeNet();
  };

  useEffect(() => {
    if (paymentGatewayInfo?.paymentGateway) {
      setSelectedGateway(paymentGatewayInfo.paymentGateway);
    }
  }, [paymentGatewayInfo]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-700">Payment Integration</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure your payment gateways and manage integrations
        </p>
      </div>

      {/* Gateway Selection */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Gateway Selection
          </h3>
        </div>
        <div className="px-6 py-5">
          <RadioGroup
            value={selectedGateway}
            onValueChange={handleGatewayChange}
            className="flex flex-col gap-3 sm:flex-row sm:gap-6"
          >
            <div className="flex items-center space-x-2 rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:border-[#6571ff]/30 hover:bg-[#6571ff]/5">
              <RadioGroupItem value="STRIPE" id="stripe" />
              <Label htmlFor="stripe" className="cursor-pointer text-sm font-medium text-gray-700">
                Stripe Only
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:border-[#6571ff]/30 hover:bg-[#6571ff]/5">
              <RadioGroupItem value="AUTHORIZE_NET" id="authorizenet" />
              <Label htmlFor="authorizenet" className="cursor-pointer text-sm font-medium text-gray-700">
                Authorize.Net Only
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:border-[#6571ff]/30 hover:bg-[#6571ff]/5">
              <RadioGroupItem value="BOTH" id="both" />
              <Label htmlFor="both" className="cursor-pointer text-sm font-medium text-gray-700">
                Both (Customer chooses)
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {/* Stripe Configuration */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Stripe Integration
          </h3>
        </div>
        <div className="flex flex-col items-center px-6 py-8">
          <div className="mb-5 flex items-center gap-3">
            <Image
              src="/icons/Logo2.png"
              alt="Autoworx"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="mx-4 text-2xl">↔️</span>
            <Image
              src="/icons/stripe.png"
              alt="Stripe"
              width={40}
              height={40}
              className="h-10 w-10"
            />
          </div>
          <p className="mb-1 text-lg font-semibold text-gray-700">
            Connect Autoworx to Stripe
          </p>
          <p className="mb-6 max-w-md text-center text-sm text-gray-500">
            Use Stripe to handle all your payment needs and manage revenue
            operations seamlessly
          </p>

          <div className="flex flex-col items-center gap-3">
            {stripeData?.success && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                <CircleCheckBig className="h-3.5 w-3.5" />
                Connected
              </span>
            )}
            <button
              onClick={() => {
                window.location.href = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID}&scope=read_write`;
              }}
              className="rounded-lg bg-[#6571ff] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#5561ef] hover:shadow-md"
            >
              {stripeData?.success
                ? "Reconnect to new Stripe account"
                : isLoading
                  ? "Loading..."
                  : "Connect with Stripe"}
            </button>
          </div>

          {loading && (
            <div className="mt-6 flex justify-center gap-1.5">
              <div className="h-2 w-2 animate-bounce rounded-full bg-[#6571ff]"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-[#6571ff] [animation-delay:-.3s]"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-[#6571ff] [animation-delay:-.5s]"></div>
            </div>
          )}
          {stripeData?.success && <StripeStatus data={stripeData} />}
        </div>
      </div>

      {/* Authorize.Net Configuration */}
      {!authorizeNetLoading && (
        <AuthorizeNetConfig
          // @ts-ignore
          companyId={session?.user?.companyId || 0}
          isConfigured={authorizeNetData?.configured || false}
          hasApiLoginId={authorizeNetData?.hasApiLoginId || false}
          onUpdate={handleRefresh}
        />
      )}
    </div>
  );
}

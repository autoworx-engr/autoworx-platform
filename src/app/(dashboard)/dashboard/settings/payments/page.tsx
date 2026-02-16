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
    <div className="flex flex-col space-y-5 px-5">
      <h2 className="text-lg font-semibold">Payment Integration</h2>

      {/* Gateway Selection */}
      <div className="rounded-lg border bg-background p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-medium">Payment Gateway Selection</h3>
        <RadioGroup
          value={selectedGateway}
          onValueChange={handleGatewayChange}
          className="space-y-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="STRIPE" id="stripe" />
            <Label htmlFor="stripe" className="cursor-pointer font-normal">
              Stripe Only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="AUTHORIZE_NET" id="authorizenet" />
            <Label
              htmlFor="authorizenet"
              className="cursor-pointer font-normal"
            >
              Authorize.Net Only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="BOTH" id="both" />
            <Label htmlFor="both" className="cursor-pointer font-normal">
              Both (Customer can choose)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Stripe Configuration */}

      <div className="payment-integration-card rounded-lg border bg-background p-6 text-center shadow-lg">
        <div className="my-4 flex items-center justify-center">
          <Image
            src="/icons/Logo2.png"
            alt="Autoworx"
            width={48}
            height={48}
            className="h-12 w-12"
          />
          <span className="mx-4 text-2xl">↔️</span>
          <Image
            src="/icons/stripe.png"
            alt="Stripe"
            width={48}
            height={48}
            className="h-12 w-12"
          />
        </div>
        <p className="my-2 text-xl font-medium">Connect Autoworx to Stripe</p>
        <p className="mb-4 text-gray-500">
          Use Stripe to handle all your payments-related needs, manage revenue
          operations
        </p>

        <div className="flex justify-center space-x-4">
          {stripeData?.success && (
            <button
              disabled
              className="flex items-center rounded-lg border bg-gray-200 px-4 py-2 text-green-600 hover:bg-blue-50"
            >
              <CircleCheckBig className="mr-2 h-5 w-5" />
              <span> Connected</span>
            </button>
          )}
          <button
            onClick={() => {
              window.location.href = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID}&scope=read_write`;
            }}
            className="rounded-lg bg-[#6571ff] px-4 py-2 capitalize text-white hover:bg-blue-700"
          >
            {stripeData?.success
              ? "Reconnect to new Stripe account"
              : isLoading
                ? "Loading..."
                : "Connect"}
          </button>
        </div>
        {loading && (
          <p className="mt-8 text-center text-gray-500">
            <div className="mx-auto flex flex-row justify-center gap-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-[#6571ff]"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-[#6571ff] [animation-delay:-.3s]"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-[#6571ff] [animation-delay:-.5s]"></div>
            </div>
          </p>
        )}
        {stripeData?.success && <StripeStatus data={stripeData} />}
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

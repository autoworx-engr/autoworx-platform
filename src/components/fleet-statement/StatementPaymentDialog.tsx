"use client";
import React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/Dialog";
import { formatCurrency } from "@/utils/formatCurrency";
import { createStripePaymentLink } from "@/actions/payment/stripePayment";
import { createAuthorizeNetPaymentLink } from "@/actions/payment/authorizeNetPayment";
import { errorToast, successToast } from "@/lib/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@radix-ui/react-select";

interface StatementPaymentDialogProps {
  statementId: string;
  companyId: number;
  totalDue: number;
  isEnabled: boolean;
  gatewayInfo?: {
    paymentGateway: "STRIPE" | "AUTHORIZE_NET" | "BOTH";
    hasStripe: boolean;
    hasAuthorizeNet: boolean;
  };
}

export const StatementPaymentDialog: React.FC<StatementPaymentDialogProps> = ({
  statementId,
  companyId,
  totalDue,
  isEnabled,
  gatewayInfo,
}) => {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(String(totalDue.toFixed(2)));
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedGateway, setSelectedGateway] = React.useState<
    "STRIPE" | "AUTHORIZE_NET"
  >("STRIPE");
  const [authorizeNetToken, setAuthorizeNetToken] = React.useState<
    string | null
  >(null);
  const [showPaymentIframe, setShowPaymentIframe] = React.useState(false);
  const [isIframeLoading, setIsIframeLoading] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Determine available gateways based on company settings
  const availableGateways: Array<"STRIPE" | "AUTHORIZE_NET"> = [];

  if (gatewayInfo) {
    if (gatewayInfo.paymentGateway === "STRIPE") {
      if (gatewayInfo.hasStripe) availableGateways.push("STRIPE");
    } else if (gatewayInfo.paymentGateway === "AUTHORIZE_NET") {
      if (gatewayInfo.hasAuthorizeNet) availableGateways.push("AUTHORIZE_NET");
    } else {
      // BOTH or any fallback value: allow all configured gateways
      if (gatewayInfo.hasStripe) availableGateways.push("STRIPE");
      if (gatewayInfo.hasAuthorizeNet) availableGateways.push("AUTHORIZE_NET");
    }
  }

  // Set default gateway based on company settings
  React.useEffect(() => {
    if (!gatewayInfo) return;

    const nextAvailable: Array<"STRIPE" | "AUTHORIZE_NET"> = [];

    if (gatewayInfo.paymentGateway === "STRIPE") {
      if (gatewayInfo.hasStripe) nextAvailable.push("STRIPE");
    } else if (gatewayInfo.paymentGateway === "AUTHORIZE_NET") {
      if (gatewayInfo.hasAuthorizeNet) nextAvailable.push("AUTHORIZE_NET");
    } else {
      if (gatewayInfo.hasStripe) nextAvailable.push("STRIPE");
      if (gatewayInfo.hasAuthorizeNet) nextAvailable.push("AUTHORIZE_NET");
    }

    let defaultGateway: "STRIPE" | "AUTHORIZE_NET" | null = null;

    if (
      gatewayInfo.paymentGateway === "AUTHORIZE_NET" &&
      nextAvailable.includes("AUTHORIZE_NET")
    ) {
      defaultGateway = "AUTHORIZE_NET";
    } else if (
      gatewayInfo.paymentGateway === "STRIPE" &&
      nextAvailable.includes("STRIPE")
    ) {
      defaultGateway = "STRIPE";
    } else if (nextAvailable.includes("STRIPE")) {
      defaultGateway = "STRIPE";
    } else if (nextAvailable.includes("AUTHORIZE_NET")) {
      defaultGateway = "AUTHORIZE_NET";
    }

    if (defaultGateway) {
      setSelectedGateway(defaultGateway);
    }
  }, [gatewayInfo]);

  const gatewayName = selectedGateway === "STRIPE" ? "Stripe" : "Authorize.Net";

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      let res;

      if (selectedGateway === "STRIPE") {
        res = await createStripePaymentLink({
          amount,
          statementId,
          companyId,
          payType: "statement",
        });
      } else {
        res = await createAuthorizeNetPaymentLink({
          amount,
          statementId,
          companyId,
          payType: "statement",
        });
        if (res.success && res.token) {
          // Use the same embedded iframe flow as invoice payments
          setAuthorizeNetToken(res.token);
          setOpen(false);
          setIsIframeLoading(true);
          setShowPaymentIframe(true);
        } else if (res.url) {
          window.open(res.url, "_self");
        } else if (!res?.success) {
          errorToast(res?.message ?? "Failed to initiate payment checkout");
        }
        return;
      }

      if (res.url) {
        window.open(res.url, "_self");
      } else if (!res?.success) {
        errorToast(res?.message ?? "Failed to initiate payment checkout");
      }
    } catch (error) {
      errorToast("An error occurred while processing payment");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle postMessage from Authorize.Net iframe
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== "https://test.authorize.net" &&
        event.origin !== "https://accept.authorize.net"
      ) {
        return;
      }

      if (typeof event.data === "string" && event.data.includes("response=")) {
        const responseData = event.data.split("response=")[1];
        try {
          const jsonObject = JSON.parse(responseData);
          const transId = jsonObject?.transId;

          if (transId) {
            successToast("Payment successful!");
            setShowPaymentIframe(false);
            setIsIframeLoading(false);
            setOpen(false);
            window.location.reload();
          } else if (jsonObject?.error) {
            errorToast(jsonObject.error.message || "Payment failed");
            setShowPaymentIframe(false);
            setIsIframeLoading(false);
          }
        } catch (error) {
          console.error("Error parsing payment response:", error);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Auto-submit form when token is set
  React.useEffect(() => {
    if (authorizeNetToken && formRef.current && showPaymentIframe) {
      formRef.current.submit();
    }
  }, [authorizeNetToken, showPaymentIframe]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="mt-4 flex justify-center lg:justify-end">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="relative inline-flex items-center px-6 py-2 text-sm font-semibold
              text-white rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600
              shadow-md hover:shadow-xl transition-all duration-300
              hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Pay Now
          </button>
        </DialogTrigger>

        <DialogContent
          className="
            sm:max-w-[450px] rounded-2xl p-6
            bg-white/90 dark:bg-slate-900/60
            backdrop-blur-xl
            ring-1 ring-slate-900/10 dark:ring-white/10
            shadow-2xl
          "
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 pb-1 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600
                  flex items-center justify-center shadow-md"
              >
                <p className="text-2xl text-white">+</p>
              </div>

              <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Make Payment with {gatewayName}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            {/* Gateway Selection - only show if multiple gateways available */}
            {availableGateways.length > 1 && (
              <div className="space-y-2">
                <label
                  htmlFor="gateway"
                  className="text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Payment Gateway
                </label>
                <Select
                  value={selectedGateway}
                  onValueChange={(value) =>
                    setSelectedGateway(value as "STRIPE" | "AUTHORIZE_NET")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    {gatewayInfo?.hasStripe && (
                      <SelectItem value="STRIPE">Stripe</SelectItem>
                    )}
                    {gatewayInfo?.hasAuthorizeNet && (
                      <SelectItem value="AUTHORIZE_NET">
                        Authorize.Net
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <label
              htmlFor="amount"
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Amount
            </label>

            <div className="space-y-1">
              <input
                id="amount"
                value={amount}
                type="text"
                disabled
                placeholder="Enter payment amount"
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-white/70 dark:bg-slate-800/60
                  border border-slate-300 dark:border-slate-700
                  shadow-sm
                  focus:ring-2 focus:ring-blue-400 focus:border-blue-500
                  outline-none transition-all duration-200
                "
                onChange={(e) => {
                  let v = e.target.value;
                  if (/^\d*\.?\d*$/.test(v)) setAmount(v);
                }}
              />

              <span className="text-xs text-slate-500 dark:text-slate-400">
                Max: {formatCurrency(totalDue)}
              </span>
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="
                px-4 py-2 rounded-lg text-sm font-medium
                bg-slate-200 dark:bg-slate-700
                text-slate-800 dark:text-slate-200
                hover:bg-slate-300 dark:hover:bg-slate-600
                transition-all duration-200
              "
              onClick={() => setOpen(false)}
            >
              Close
            </button>

            <button
              type="button"
              disabled={isLoading || !amount || Number(amount) <= 0}
              onClick={handlePayment}
              className={`
                px-4 py-2 rounded-lg text-sm font-semibold text-white
                bg-gradient-to-r from-blue-500 to-indigo-600
                shadow-md hover:shadow-xl transition-all duration-300
                hover:-translate-y-0.5 focus:ring-2 focus:ring-blue-400
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isLoading ? "Processing..." : `Checkout with ${gatewayName}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Authorize.Net Payment Iframe for statement payments */}
      {showPaymentIframe && authorizeNetToken && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] relative mx-4 flex flex-col">
            <div className="flex justify-end p-3">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentIframe(false);
                  setAuthorizeNetToken(null);
                  setIsIframeLoading(false);
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 h-auto text-sm rounded-md shadow"
              >
                Cancel Payment
              </button>
            </div>
            <div className="relative flex-1 pb-3 px-3">
              <iframe
                id="authorize_net_payment_iframe"
                name="authorize_net_payment_iframe"
                className="w-full h-full rounded-lg"
                src="/IFrameCommunicator.html"
                onLoad={() => setIsIframeLoading(false)}
              />
              {isIframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6571ff] border-t-transparent" />
                  <p className="mt-3 text-sm text-gray-600 text-center px-4">
                    Loading secure payment page...
                  </p>
                </div>
              )}
            </div>
            <form
              ref={formRef}
              id="send_token_form"
              method="post"
              target="authorize_net_payment_iframe"
              action={
                process.env.NODE_ENV === "production"
                  ? "https://accept.authorize.net/payment/payment"
                  : "https://test.authorize.net/payment/payment"
              }
              style={{ display: "none" }}
            >
              <input type="hidden" name="token" value={authorizeNetToken} />
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

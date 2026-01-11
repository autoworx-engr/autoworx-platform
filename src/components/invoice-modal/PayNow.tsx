import { createStripePaymentLink } from "@/actions/payment/stripePayment";
import { createAuthorizeNetPaymentLink } from "@/actions/payment/authorizeNetPayment";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../Dialog";
import { Label } from "../ui/label";
import { errorToast, successToast } from "@/lib/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface PaymentGatewayInfo {
  paymentGateway: "STRIPE" | "AUTHORIZE_NET" | "BOTH";
  hasStripe: boolean;
  hasAuthorizeNet: boolean;
}

export function hardReload() {
  const url = new URL(window.location.href);
  url.searchParams.set("_reload", Date.now().toString());
  window.location.href = url.toString();
}

export function PayNow({
  due,
  invoiceId,
  statementId,
  mode = "invoice",
  companyId,
  open,
  setOpen,
  gatewayInfo,
}: {
  due: string;
  invoiceId?: string;
  statementId?: string;
  mode?: "invoice" | "statement";
  companyId: number;
  open: boolean;
  setOpen: any;
  gatewayInfo?: PaymentGatewayInfo;
}) {
  const router = useRouter();

  const [amount, setAmount] = useState(due);
  const [isLoading, setIsLoading] = useState(false);
  const [payType, setPayType] = useState<"payment" | "deposit" | "statement">(
    () => (mode === "statement" ? "statement" : "payment")
  );
  const [selectedGateway, setSelectedGateway] = useState<
    "STRIPE" | "AUTHORIZE_NET"
  >("STRIPE");
  const [authorizeNetToken, setAuthorizeNetToken] = useState<string | null>(
    null
  );
  const [showPaymentIframe, setShowPaymentIframe] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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
  useEffect(() => {
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

  // Handle postMessage from Authorize.Net iframe / communicator
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Accept messages from Authorize.Net and from our own
      // iframe communicator (same-origin). This is needed
      // because Authorize.Net posts to the communicator, and
      // the communicator relays the message to window.top.
      const allowedOrigins = [
        "https://test.authorize.net",
        "https://accept.authorize.net",
        window.location.origin,
      ];

      if (!allowedOrigins.includes(event.origin)) return;

      console.log("🔔 Received message from Authorize.Net:", event.data);

      // Check if the message contains a payment response
      if (typeof event.data === "string" && event.data.includes("response=")) {
        const responseData = event.data.split("response=")[1];
        try {
          const jsonObject = JSON.parse(responseData);
          console.log("💳 Payment Response:", jsonObject);

          const transId = jsonObject?.transId;
          if (transId) {
            console.log("✅ Transaction ID:", transId);
            successToast("Payment successful!");
            setShowPaymentIframe(false);
            setOpen(false);
            // Reload page to show updated payment status
            hardReload();
          } else if (jsonObject?.error) {
            errorToast(jsonObject.error.message || "Payment failed");
            setShowPaymentIframe(false);
          }
        } catch (error) {
          console.error("Error parsing payment response:", error);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setOpen]);

  // Auto-submit form when token is set
  useEffect(() => {
    if (authorizeNetToken && formRef.current && showPaymentIframe) {
      console.log("📤 Submitting payment form to iframe");
      formRef.current.submit();
    }
  }, [authorizeNetToken, showPaymentIframe]);

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      let result;

      if (selectedGateway === "STRIPE") {
        if (mode === "statement") {
          result = await createStripePaymentLink({
            amount,
            statementId: statementId!,
            companyId,
            payType: "statement",
          });
        } else {
          result = await createStripePaymentLink({
            amount,
            invoiceId: invoiceId!,
            companyId,
            payType,
          });
        }

        if (result.url) {
          window.open(result.url, "_self");
        } else if (!result?.success) {
          errorToast(result?.message ?? "Failed to initiate payment checkout");
        }
      } else {
        if (mode === "statement") {
          result = await createAuthorizeNetPaymentLink({
            amount,
            statementId: statementId!,
            companyId,
            payType: "statement",
          });
        } else {
          result = await createAuthorizeNetPaymentLink({
            amount,
            invoiceId: invoiceId!,
            companyId,
            payType,
          });
        }

        if (result.success && result.token) {
          console.log("🎫 Received Authorize.Net token, opening iframe");
          setAuthorizeNetToken(result.token);
          // Close the dialog and then show the dedicated Authorize.Net iframe overlay
          setOpen(false);
          setIsIframeLoading(true);
          setShowPaymentIframe(true);
        } else if (!result?.success) {
          errorToast(result?.message ?? "Failed to initiate payment checkout");
        }
      }
    } catch (error) {
      errorToast("An error occurred while processing payment");
    } finally {
      setIsLoading(false);
    }
  };

  const gatewayName = selectedGateway === "STRIPE" ? "Stripe" : "Authorize.Net";

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {mode === "invoice" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-fit ml-auto bg-[#6571ff] text-white font-medium py-1 pb-1.5 px-7 rounded transition-colors duration-200 shadow-sm flex items-center justify-between text-sm">
                Pay Now
                <ChevronDown className="w-4 h-4 ml-1.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full bg-[#6571ff]">
              <DropdownMenuItem className="w-full text-white bg-[#6571ff] cursor-pointer p-0.5">
                <DialogTrigger asChild>
                  <button
                    onClick={() => {
                      setPayType("payment");
                      setAmount(due);
                    }}
                    className="w-full rounded py-1 bg-[#6571ff] text-white"
                  >
                    Payment
                  </button>
                </DialogTrigger>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white bg-[#6571ff] cursor-pointer p-0.5">
                <DialogTrigger asChild>
                  <button
                    onClick={() => {
                      setPayType("deposit");
                      setAmount(due);
                    }}
                    className="w-full rounded py-1 bg-[#6571ff] text-white"
                  >
                    Deposit
                  </button>
                </DialogTrigger>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DialogTrigger asChild>
            <button
              type="button"
              className="relative inline-flex items-center px-6 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ml-auto"
            >
              Pay Now
            </button>
          </DialogTrigger>
        )}

        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {mode === "statement"
                ? "Make Statement Payment"
                : `Make ${payType === "payment" ? "Payment" : "Deposit"}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Gateway Selection */}
            {availableGateways.length > 1 ? (
              <div className="space-y-2">
                <Label htmlFor="gateway">Payment Gateway</Label>
                <select
                  id="gateway"
                  value={selectedGateway}
                  onChange={(e) =>
                    setSelectedGateway(
                      e.target.value as "STRIPE" | "AUTHORIZE_NET"
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2 bg-white"
                >
                  {gatewayInfo?.hasStripe && (
                    <option value="STRIPE">Stripe</option>
                  )}
                  {gatewayInfo?.hasAuthorizeNet && (
                    <option value="AUTHORIZE_NET">Authorize.Net</option>
                  )}
                </select>
              </div>
            ) : availableGateways.length === 1 ? (
              <div className="space-y-2">
                <Label>Payment Gateway</Label>
                <div className="w-full rounded-lg border px-3 py-2 bg-gray-50 text-gray-700">
                  {gatewayName}
                </div>
              </div>
            ) : null}

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div>
                <input
                  id="amount"
                  value={amount}
                  type="text"
                  disabled={mode === "statement"}
                  placeholder={
                    mode === "statement"
                      ? "Statement amount"
                      : payType === "deposit"
                        ? "Enter deposit amount"
                        : "Enter payment amount"
                  }
                  className="w-full rounded-lg border px-2 py-2"
                  onChange={(e) => {
                    let inputValue = e.target.value;

                    // Allow only numeric input with optional decimal
                    if (!/^\d*\.?\d*$/.test(inputValue)) return;

                    // Do not allow more than the invoice's remaining
                    // due amount for either payments or deposits. If
                    // the user types above the max, clamp it back to
                    // the max due.
                    const maxDue = parseFloat(due || "0");
                    const numeric = parseFloat(inputValue || "0");
                    if (!isNaN(maxDue) && numeric > maxDue) {
                      inputValue = maxDue.toString();
                    }

                    setAmount(inputValue);
                  }}
                />

                <span className="block w-full text-xs text-right mt-2">
                  ( Max. {due} )
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="bg-[#6571ff] text-white"
              type="button"
              disabled={isLoading || !amount || Number(amount) <= 0}
              onClick={handlePayment}
            >
              {isLoading ? "Processing..." : `Checkout with ${gatewayName}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Authorize.Net Payment Iframe */}
      {showPaymentIframe && authorizeNetToken && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-indigo-900/80 backdrop-blur-sm">
          <div className="bg-white/95 border border-slate-200 shadow-2xl rounded-2xl w-full max-w-4xl h-[90vh] relative mx-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-900/90 text-slate-50">
              <div>
                <p className="text-sm font-semibold tracking-wide uppercase text-slate-200">
                  Secure Payment
                </p>
                <p className="text-xs text-slate-300">
                  Powered by Authorize.Net • Encrypted checkout
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setShowPaymentIframe(false);
                  setAuthorizeNetToken(null);
                  setIsIframeLoading(false);
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 h-auto text-xs md:text-sm rounded-full shadow-md"
              >
                Cancel Payment
              </Button>
            </div>
            <div className="relative flex-1 pb-4 px-4 bg-slate-50">
              <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Autoworx Secure Checkout</span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>SSL Protected</span>
                </span>
              </div>
              <iframe
                id="authorize_net_payment_iframe"
                name="authorize_net_payment_iframe"
                className="w-full h-full rounded-xl bg-white shadow-inner border border-slate-200"
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
                process.env.AUTHORIZE_NET_ENVIRONMENT === "production"
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
    </>
  );
}

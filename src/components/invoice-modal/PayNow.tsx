import { createAuthorizeNetPaymentLink } from "@/actions/payment/authorizeNetPayment";
import { createStripePaymentLink } from "@/actions/payment/stripePayment";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

import { errorToast, successToast } from "@/lib/toast";
import { ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../Dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Label } from "../ui/label";

interface PaymentGatewayInfo {
  paymentGateway: "STRIPE" | "AUTHORIZE_NET" | "BOTH";
  hasStripe: boolean;
  hasAuthorizeNet: boolean;
  tipEnabled?: boolean;
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
  shopBookingId,
  paymentId,
  giftCardSource,
  giftCardCode,
  giftCardId,
  mode = "invoice",
  companyId,
  open,
  setOpen,
  gatewayInfo,
  onSuccess,
}: {
  due: string;
  invoiceId?: string;
  statementId?: string;
  shopBookingId?: string;
  paymentId?: string;
  giftCardSource?: "purchase" | "reload";
  giftCardCode?: string;
  giftCardId?: number;
  mode?: "invoice" | "statement" | "virtual_shop" | "virtual_shop_gift_card";
  companyId: number;
  open: boolean;
  setOpen: any;
  gatewayInfo?: PaymentGatewayInfo;
  onSuccess?: () => void;
}) {
  const [amount, setAmount] = useState(due);
  const [selectedTipPercent, setSelectedTipPercent] = useState<number | null>(
    null,
  );
  const [customTip, setCustomTip] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [payType, setPayType] = useState<
    | "payment"
    | "deposit"
    | "statement"
    | "virtual_shop_deposit"
    | "virtual_shop_gift_card"
  >(() =>
    mode === "statement"
      ? "statement"
      : mode === "virtual_shop"
        ? "virtual_shop_deposit"
        : mode === "virtual_shop_gift_card"
          ? "virtual_shop_gift_card"
          : "payment",
  );
  const [selectedGateway, setSelectedGateway] = useState<
    "STRIPE" | "AUTHORIZE_NET"
  >("STRIPE");
  const [authorizeNetToken, setAuthorizeNetToken] = useState<string | null>(
    null,
  );
  const [authorizeNetUrl, setAuthorizeNetUrl] = useState<string | null>(null);
  const [showPaymentIframe, setShowPaymentIframe] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setAmount(due);
  }, [due]);

  useEffect(() => {
    if (mode === "statement") {
      setPayType("statement");
    } else if (mode === "virtual_shop") {
      setPayType("virtual_shop_deposit");
    } else if (mode === "virtual_shop_gift_card") {
      setPayType("virtual_shop_gift_card");
    } else {
      setPayType("payment");
    }
  }, [mode]);

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

    // Keep the user's selected gateway if it is still available.
    if (nextAvailable.includes(selectedGateway)) {
      return;
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
  }, [gatewayInfo, selectedGateway]);

  // Handle postMessage from Authorize.Net iframe / communicator
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from Authorize.Net and from our own
      // iframe communicator (same-origin). This is needed
      // because Authorize.Net posts to the communicator, and
      // the communicator relays the message to window.top.
      const isAuthorizeNetOrigin =
        event.origin === "https://test.authorize.net" ||
        event.origin === "https://accept.authorize.net";

      let isTrustedAppOrigin = false;
      try {
        const eventHost = new URL(event.origin).hostname.toLowerCase();
        const currentHost = window.location.hostname.toLowerCase();
        isTrustedAppOrigin =
          eventHost === currentHost || eventHost.endsWith(".autoworx.tech");
      } catch {
        isTrustedAppOrigin = false;
      }

      if (!isAuthorizeNetOrigin && !isTrustedAppOrigin) return;

      let rawResponse = "";

      if (typeof event.data === "string") {
        const payload = event.data.trim();
        if (!payload) return;

        const params = new URLSearchParams(payload);
        rawResponse = params.get("response") || "";

        if (!rawResponse && payload.includes("response=")) {
          rawResponse = payload.split("response=")[1] || "";
        }
      } else if (event.data && typeof event.data === "object") {
        rawResponse =
          typeof (event.data as any).response === "string"
            ? (event.data as any).response
            : "";
      }

      if (!rawResponse) return;

      try {
        let decodedResponse = rawResponse;
        try {
          decodedResponse = decodeURIComponent(rawResponse);
        } catch {
          decodedResponse = rawResponse;
        }

        const jsonObject = JSON.parse(decodedResponse);
        const transId = jsonObject?.transId;

        if (transId) {
          successToast("Payment successful!");
          setShowPaymentIframe(false);
          setOpen(false);
          if (onSuccess) {
            onSuccess();
          } else {
            // Reload page to show updated payment status
            hardReload();
          }
          return;
        }

        if (jsonObject?.error) {
          errorToast(jsonObject.error.message || "Payment failed");
          setShowPaymentIframe(false);
        }
      } catch {
        errorToast("Unable to verify payment response");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setOpen, onSuccess]);

  // Auto-submit form when token is set
  useEffect(() => {
    if (authorizeNetToken && formRef.current && showPaymentIframe) {
      formRef.current.submit();
    }
  }, [authorizeNetToken, showPaymentIframe]);

  const handlePayment = async () => {
    setIsLoading(true);
    const tipStr = tipAmount > 0 ? tipAmount.toString() : undefined;
    try {
      let result;

      if (selectedGateway === "STRIPE") {
        if (mode === "statement") {
          result = await createStripePaymentLink({
            amount,
            tip: tipStr,
            statementId: statementId!,
            companyId,
            payType: "statement",
          });
        } else if (mode === "virtual_shop") {
          result = await createStripePaymentLink({
            amount,
            tip: tipStr,
            shopBookingId: shopBookingId!,
            companyId,
            payType: "virtual_shop_deposit",
            redirectUrl: window.location.href,
          });
        } else if (mode === "virtual_shop_gift_card") {
          result = await createStripePaymentLink({
            amount,
            tip: tipStr,
            paymentId: paymentId!,
            giftCardSource,
            giftCardCode,
            giftCardId,
            companyId,
            payType: "virtual_shop_gift_card",
            redirectUrl: window.location.href,
          });
        } else {
          result = await createStripePaymentLink({
            amount,
            tip: tipStr,
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
            tip: tipStr,
            statementId: statementId!,
            companyId,
            payType: "statement",
          });
        } else if (mode === "virtual_shop") {
          result = await createAuthorizeNetPaymentLink({
            amount,
            tip: tipStr,
            shopBookingId: shopBookingId!,
            companyId,
            payType: "virtual_shop_deposit",
            redirectUrl: window.location.href,
          });
        } else if (mode === "virtual_shop_gift_card") {
          result = await createAuthorizeNetPaymentLink({
            amount,
            tip: tipStr,
            paymentId: paymentId!,
            giftCardSource,
            giftCardCode,
            giftCardId,
            companyId,
            payType: "virtual_shop_gift_card",
            redirectUrl: window.location.href,
          });
        } else {
          result = await createAuthorizeNetPaymentLink({
            amount,
            tip: tipStr,
            invoiceId: invoiceId!,
            companyId,
            payType,
          });
        }

        if (result.success && result.token) {
          setAuthorizeNetToken(result.token);
          if (result.url) {
            setAuthorizeNetUrl(result.url);
          }
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

  const tipPercentages = [10, 15, 20];
  const baseAmount = parseFloat(amount || "0");
  const tipAmount = customTip
    ? parseFloat(customTip || "0")
    : selectedTipPercent
      ? parseFloat((baseAmount * (selectedTipPercent / 100)).toFixed(2))
      : 0;
  const totalAmount = parseFloat((baseAmount + tipAmount).toFixed(2));

  const gatewayName = selectedGateway === "STRIPE" ? "Stripe" : "Authorize.Net";

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {mode === "invoice" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-fit ml-auto bg-primary text-white font-medium py-1 pb-1.5 px-7 rounded transition-colors duration-200 shadow-sm flex items-center justify-between text-sm">
                Pay Now
                <ChevronDown className="w-4 h-4 ml-1.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full bg-primary">
              <DropdownMenuItem className="w-full text-white bg-primary cursor-pointer p-0.5">
                <DialogTrigger asChild>
                  <button
                    onClick={() => {
                      setPayType("payment");
                      setAmount(due);
                    }}
                    className="w-full rounded py-1 bg-primary text-white"
                  >
                    Payment
                  </button>
                </DialogTrigger>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white bg-primary cursor-pointer p-0.5">
                <DialogTrigger asChild>
                  <button
                    onClick={() => {
                      setPayType("deposit");
                      setAmount(due);
                    }}
                    className="w-full rounded py-1 bg-primary text-white"
                  >
                    Deposit
                  </button>
                </DialogTrigger>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : mode === "statement" ? (
          <DialogTrigger asChild>
            <button
              type="button"
              className="relative inline-flex items-center px-6 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ml-auto"
            >
              Pay Now
            </button>
          </DialogTrigger>
        ) : null}

        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {mode === "statement"
                ? "Make Statement Payment"
                : mode === "virtual_shop"
                  ? "Pay Booking Deposit"
                  : mode === "virtual_shop_gift_card"
                    ? "Pay Gift Card"
                    : `Make ${payType === "payment" ? "Payment" : "Deposit"}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Gateway selection is internal — not shown to customers */}

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div>
                <input
                  id="amount"
                  value={amount}
                  type="text"
                  disabled={mode !== "invoice"}
                  placeholder={
                    mode === "statement"
                      ? "Statement amount"
                      : mode === "virtual_shop"
                        ? "Booking deposit amount"
                        : mode === "virtual_shop_gift_card"
                          ? "Gift card amount"
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

            {/* Add a Tip */}
            {gatewayInfo?.tipEnabled && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Add a Tip</Label>
                  </div>
                  <div className="flex gap-2">
                    {tipPercentages.map((percent) => {
                      const tipVal = parseFloat(
                        (baseAmount * (percent / 100)).toFixed(2),
                      );
                      const isSelected =
                        selectedTipPercent === percent && !customTip;
                      return (
                        <button
                          key={percent}
                          type="button"
                          onClick={() => {
                            setCustomTip("");
                            setSelectedTipPercent(
                              selectedTipPercent === percent ? null : percent,
                            );
                          }}
                          className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                            isSelected
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-gray-700 border-gray-300 hover:border-primary"
                          }`}
                        >
                          {percent}% | ${tipVal.toFixed(2)}
                          {isSelected && " \u2713"}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      Custom Tip
                    </span>
                    <input
                      type="text"
                      value={customTip}
                      placeholder="$0.00"
                      className="flex-1 text-sm outline-none bg-transparent"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/^\d*\.?\d*$/.test(val)) return;
                        setCustomTip(val);
                        if (val) setSelectedTipPercent(null);
                      }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      $
                      {customTip
                        ? parseFloat(customTip || "0").toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-end">
                  <span className="text-base font-bold">
                    Total: ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              className="bg-primary text-white"
              type="button"
              disabled={isLoading || !amount || Number(amount) <= 0}
              onClick={handlePayment}
            >
              {isLoading ? "Processing..." : "Checkout"}
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
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                authorizeNetUrl || "https://test.authorize.net/payment/payment"
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

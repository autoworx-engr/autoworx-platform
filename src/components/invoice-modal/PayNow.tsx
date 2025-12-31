import { createStripePaymentLink } from "@/actions/payment/stripePayment";
import { createAuthorizeNetPaymentLink } from "@/actions/payment/authorizeNetPayment";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
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

export function PayNow({
  due,
  invoiceId,
  companyId,
  open,
  setOpen,
  gatewayInfo,
}: {
  due: string;
  invoiceId: string;
  companyId: number;
  open: boolean;
  setOpen: any;
  gatewayInfo?: PaymentGatewayInfo;
}) {
  const [amount, setAmount] = useState(due);
  const [isLoading, setIsLoading] = useState(false);
  const [payType, setPayType] = useState<"payment" | "deposit">("payment");
  const [selectedGateway, setSelectedGateway] = useState<
    "STRIPE" | "AUTHORIZE_NET"
  >("STRIPE");
  const [authorizeNetToken, setAuthorizeNetToken] = useState<string | null>(
    null
  );
  const [showPaymentIframe, setShowPaymentIframe] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Determine available gateways
  const availableGateways: Array<"STRIPE" | "AUTHORIZE_NET"> = [];
  if (gatewayInfo?.hasStripe) availableGateways.push("STRIPE");
  if (gatewayInfo?.hasAuthorizeNet) availableGateways.push("AUTHORIZE_NET");

  // Set default gateway based on company settings
  useEffect(() => {
    if (gatewayInfo) {
      if (
        gatewayInfo.paymentGateway === "AUTHORIZE_NET" &&
        gatewayInfo.hasAuthorizeNet
      ) {
        setSelectedGateway("AUTHORIZE_NET");
      } else if (gatewayInfo.hasStripe) {
        setSelectedGateway("STRIPE");
      } else if (gatewayInfo.hasAuthorizeNet) {
        setSelectedGateway("AUTHORIZE_NET");
      }
    }
  }, [gatewayInfo]);

  // Handle postMessage from Authorize.Net iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from Authorize.Net domains
      if (
        event.origin !== "https://test.authorize.net" &&
        event.origin !== "https://accept.authorize.net"
      ) {
        return;
      }

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
            window.location.reload();
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
        result = await createStripePaymentLink({
          amount,
          invoiceId,
          companyId,
          payType,
        });

        if (result.url) {
          window.open(result.url, "_self");
        } else if (!result?.success) {
          errorToast(result?.message ?? "Failed to initiate payment checkout");
        }
      } else {
        result = await createAuthorizeNetPaymentLink({
          amount,
          invoiceId,
          companyId,
          payType,
        });

        if (result.success && result.token) {
          console.log("🎫 Received Authorize.Net token, opening iframe");
          setAuthorizeNetToken(result.token);
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
                    setAmount("");
                  }}
                  className="w-full rounded py-1 bg-[#6571ff] text-white"
                >
                  Deposit
                </button>
              </DialogTrigger>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Make {payType === "payment" ? "Payment" : "Deposit"}
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
                  placeholder={
                    payType === "deposit"
                      ? "Enter deposit amount"
                      : "Enter payment amount"
                  }
                  className="w-full rounded-lg border px-2 py-2"
                  onChange={(e) => {
                    let inputValue = e.target.value;
                    if (/^\d*\.?\d*$/.test(inputValue)) {
                      setAmount(inputValue);
                    }
                  }}
                />
                {payType === "payment" && (
                  <span className="text-xs">( Max. {due} )</span>
                )}
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
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] relative">
            <button
              onClick={() => {
                setShowPaymentIframe(false);
                setAuthorizeNetToken(null);
              }}
              className="absolute top-4 right-4 z-10 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Cancel Payment
            </button>
            <iframe
              id="authorize_net_payment_iframe"
              name="authorize_net_payment_iframe"
              className="w-full h-full rounded-lg"
              src="/IFrameCommunicator.html"
            />
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
    </>
  );
}

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
import { errorToast } from "@/lib/toast";
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

  // Determine available gateways
  const availableGateways: Array<"STRIPE" | "AUTHORIZE_NET"> = [];
  if (gatewayInfo?.hasStripe) availableGateways.push("STRIPE");
  if (gatewayInfo?.hasAuthorizeNet) availableGateways.push("AUTHORIZE_NET");

  // Set default gateway based on company settings
  React.useEffect(() => {
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

  if (!isEnabled) {
    return null;
  }

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
    </div>
  );
};

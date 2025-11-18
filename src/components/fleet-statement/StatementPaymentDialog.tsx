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
import { errorToast } from "@/lib/toast";

interface StatementPaymentDialogProps {
  statementId: string;
  companyId: number;
  totalDue: number;
  isEnabled: boolean;
}

export const StatementPaymentDialog: React.FC<StatementPaymentDialogProps> = ({
  statementId,
  companyId,
  totalDue,
  isEnabled,
}) => {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(String(totalDue.toFixed(2)));
  const [isLoading, setIsLoading] = React.useState(false);

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
                Make Payment with Stripe
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
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
              onClick={async () => {
                setIsLoading(true);
                const res = await createStripePaymentLink({
                  amount,
                  statementId,
                  companyId,
                  payType: "statement",
                });
                if (res.url) {
                  window.open(res.url, "_self");
                } else if (!res?.success) {
                  errorToast(res?.message ?? "Failed initiate Stripe checkout");
                }
                setIsLoading(false);
              }}
              className={`
                px-4 py-2 rounded-lg text-sm font-semibold text-white
                bg-gradient-to-r from-blue-500 to-indigo-600
                shadow-md hover:shadow-xl transition-all duration-300
                hover:-translate-y-0.5 focus:ring-2 focus:ring-blue-400
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isLoading ? "Processing..." : "Checkout to Stripe"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

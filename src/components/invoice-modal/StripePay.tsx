import { createStripePaymentLink } from "@/actions/payment/stripePayment";
import { Button } from "@/components/ui/button";
import { errorToast } from "@/lib/toast";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
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

export function StripePay({
  due,
  invoiceId,
  companyId,
  open,
  setOpen,
}: {
  due: string;
  invoiceId: string;
  companyId: number;
  open: boolean;
  setOpen: any;
}) {
  const [amount, setAmount] = useState(due);
  const [isLoading, setIsLoading] = useState(false);
  const [payType, setPayType] = useState<"payment" | "deposit">("payment");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-fit ml-auto bg-primary text-white font-medium py-1 pb-1.5
            px-7 rounded transition-colors duration-200 shadow-sm flex items-center justify-between text-sm"
          >
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
                  setAmount(due); // Reset to due amount for payments
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
                  setAmount(due); // Default deposit amount to full due
                }}
                className="w-full rounded py-1 bg-primary text-white"
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
            Make {payType === "payment" ? "Payment" : "Deposit"} With Stripe
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="gap-4">
            <Label htmlFor="name" className="mb-2 text-right">
              Amount
            </Label>
            <div>
              <input
                value={amount}
                type="text"
                placeholder={
                  payType === "deposit"
                    ? `Enter deposit amount (Max. ${due})`
                    : "Enter payment amount"
                }
                className="w-full rounded-lg border px-2 py-2"
                onChange={(e) => {
                  let inputValue = e.target.value;

                  // Allow only numbers, decimal points, and ensure a valid float format
                  if (/^\d*\.?\d*$/.test(inputValue)) {
                    setAmount(inputValue);
                  }
                }}
              />
              <span className="text-xs">( Max. {due} )</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-primary text-white"
            type="button"
            disabled={isLoading || !amount || Number(amount) <= 0}
            onClick={async () => {
              const numericAmount = Number(amount);
              const numericDue = Number(due);

              if (Number.isNaN(numericAmount) || numericAmount <= 0) {
                errorToast("Please enter a valid amount");
                return;
              }

              if (payType === "deposit" && numericAmount > numericDue) {
                errorToast("Deposit amount cannot exceed total due");
                return;
              }

              setIsLoading(true);
              const res = await createStripePaymentLink({
                amount,
                invoiceId,
                companyId,
                payType,
              });
              if (res.url) {
                window.open(res.url, "_self");
              } else if (!res?.success) {
                errorToast(res?.message ?? "Failed initiate Stripe checkout");
              }
              setIsLoading(false);
            }}
          >
            Checkout to Stripe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { createStripePaymentLink } from "@/actions/payment/stripePayment";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../Dialog";
import { Label } from "../ui/label";
import { errorToast } from "@/lib/toast";

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
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="bg-[#6571ff] text-white">
          Pay with Stripe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Make Payment With Stripe</DialogTitle>
          {/* <DialogDescription>
            Pay your invoice dues with Stripe
          </DialogDescription> */}
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
                className="w-full rounded-lg border px-2 py-2"
                onChange={(e) => {
                  let inputValue = e.target.value;

                  // Allow only numbers, decimal points, and ensure a valid float format
                  if (/^\d*\.?\d*$/.test(inputValue)) {
                    setAmount(inputValue);
                  }

                  // Number(inputValue) <= due && setAmount(Number(inputValue));
                }}
              />
              <span className="text-xs">( Max. {due} )</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-[#6571ff] text-white"
            type="button"
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true);
              const res = await createStripePaymentLink({
                amount,
                invoiceId,
                companyId,
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

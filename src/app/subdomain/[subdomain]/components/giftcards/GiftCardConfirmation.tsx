import { Button } from "@/components/ui/button";
import { Check, Copy, Gift, Shield } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Props {
  confirmationNumber: string;
  maskedCode: string;
  amount: number;
  recipientName: string;
  deliveryMethod: string;
  sendTiming: string;
  shopName: string;
}

const GiftCardConfirmation = ({
  confirmationNumber,
  maskedCode,
  amount,
  recipientName,
  deliveryMethod,
  sendTiming,
  shopName,
}: Props) => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(confirmationNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Check className="w-8 h-8 text-primary" />
      </div>

      <div>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Purchase Complete!
        </h2>
        <p className="text-muted-foreground mt-1">
          Your gift card has been processed successfully
        </p>
      </div>

      <div className="w-full rounded-xl border bg-card p-5 space-y-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Confirmation #</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-medium">{confirmationNumber}</span>
            <button
              onClick={copyCode}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gift Card</span>
          <span className="font-mono">{maskedCode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-semibold">${amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Recipient</span>
          <span>{recipientName || "Yourself"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Delivery</span>
          <span className="capitalize">
            {deliveryMethod} • {sendTiming}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-primary">
        <Shield className="w-4 h-4" />
        <span className="font-medium">Gift cards never expire</span>
      </div>

      <Link href="/dashboard/virtualization">
        <Button variant="outline" className="gap-2">
          <Gift className="w-4 h-4" /> Back to Booking
        </Button>
      </Link>
    </div>
  );
};

export default GiftCardConfirmation;

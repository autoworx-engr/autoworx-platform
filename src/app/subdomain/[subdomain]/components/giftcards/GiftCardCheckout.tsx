import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Shield } from "lucide-react";
import {
  GiftCardDesign,
  GiftCardPolicies,
  GiftCardPurchaseData,
} from "../../data/gift-card-types";

interface Props {
  data: GiftCardPurchaseData;
  design: GiftCardDesign | undefined;
  policies: GiftCardPolicies;
  shopName: string;
  isPending?: boolean;
  onConsentChange: (v: boolean) => void;
  onConfirm: () => void | Promise<void>;
  isProcessing?: boolean;
}

const GiftCardCheckout = ({
  data,
  design,
  policies,
  shopName,
  isPending = false,
  onConsentChange,
  onConfirm,
  isProcessing = false,
}: Props) => {
  const isBusy = isProcessing || isPending;
  const discountAmount = data.discountApplied
    ? data.discountApplied.type === "percent"
      ? data.amount * (data.discountApplied.value / 100)
      : data.discountApplied.value
    : 0;
  const total = Math.max(0, data.amount - discountAmount);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h3
          className="text-lg font-semibold tracking-tight mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Checkout
        </h3>
        <p className="text-sm text-muted-foreground">
          Review your gift card purchase
        </p>
      </div>

      {/* Design Preview */}
      {design && (
        <div className="relative rounded-2xl overflow-hidden aspect-[16/9] border shadow-md">
          <img
            src={design.imageUrl}
            alt={design.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <p className="text-white/80 text-xs">{shopName}</p>
              <p
                className="text-white text-lg font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Gift Card
              </p>
            </div>
            <p
              className="text-white text-2xl font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              ${data.amount}
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Gift Card Amount</span>
          <span className="font-medium">${data.amount.toFixed(2)}</span>
        </div>
        {data.discountApplied && (
          <div className="flex justify-between text-sm">
            <span className="text-primary">
              Discount ({data.discountApplied.code})
            </span>
            <span className="text-primary font-medium">
              -${discountAmount.toFixed(2)}
            </span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-semibold">
          <span>Total Due</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Details
        </p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Buyer</span>
          <span>{data.buyerName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Buyer Email</span>
          <span>{data.buyerEmail}</span>
        </div>
        {!data.sendToSelf && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipient</span>
              <span>{data.recipientName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="capitalize">{data.deliveryMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Send To</span>
              <span>{data.recipientContact}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timing</span>
              <span className="capitalize">{data.sendTiming}</span>
            </div>
          </>
        )}
        {data.sendToSelf && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span>Send to myself</span>
          </div>
        )}
      </div>

      {/* Never expire */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <Shield className="w-4 h-4 text-primary shrink-0" />
        <p className="text-sm text-primary font-medium">
          Gift cards never expire.
        </p>
      </div>

      {/* Legal */}
      <div className="space-y-3 text-xs text-muted-foreground">
        <p>
          By purchasing an eGift Card you agree to{" "}
          <a
            href={policies.termsUrl}
            className="text-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href={policies.privacyUrl}
            className="text-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            Privacy Policy
          </a>
          .
        </p>
        <p>
          By completing this purchase, I acknowledge that I am liable for any
          loss associated with the gift card purchase in the event that the
          seller is unable to fulfill the goods or services.
        </p>
      </div>

      {/* Consent */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="purchase-consent"
          checked={data.purchaseConsent}
          onCheckedChange={(v) => onConsentChange(!!v)}
          className="mt-0.5"
        />
        <label htmlFor="purchase-consent" className="text-sm cursor-pointer">
          I agree to the terms and acknowledge the statement above
        </label>
      </div>

      {/* Pay */}
      <Button
        className="w-full h-12 gap-2 text-base"
        disabled={!data.purchaseConsent || isBusy}
        onClick={onConfirm}
      >
        <CreditCard className="w-4 h-4" />
        {isBusy ? "Processing payment..." : `Pay $${total.toFixed(2)}`}
      </Button>
    </div>
  );
};

export default GiftCardCheckout;

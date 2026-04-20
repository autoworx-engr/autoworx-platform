import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Tag, X } from "lucide-react";
import { GiftCardDiscount } from "../../data/gift-card-types";

interface Props {
  discounts: GiftCardDiscount[];
  applied: GiftCardDiscount | null;
  onApply: (discount: GiftCardDiscount | null) => void;
  onCodeChange: (code: string) => void;
  code: string;
}

const DiscountCode = ({
  discounts,
  applied,
  onApply,
  onCodeChange,
  code,
}: Props) => {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleApply = () => {
    const match = discounts.find(
      (d) => d.code.toUpperCase() === code.toUpperCase(),
    );
    if (
      match &&
      match.usedCount < match.usageLimit &&
      new Date(match.expiryDate) > new Date()
    ) {
      setStatus("success");
      onApply(match);
    } else {
      setStatus("error");
      onApply(null);
    }
  };

  const handleClear = () => {
    setStatus("idle");
    onCodeChange("");
    onApply(null);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3
          className="text-lg font-semibold tracking-tight mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Discount Code
        </h3>
        <p className="text-sm text-muted-foreground">
          Have a promo code? Enter it below
        </p>
      </div>

      {applied ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Tag className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary flex-1">
            {applied.code} —{" "}
            {applied.type === "percent"
              ? `${applied.value}% off`
              : `$${applied.value} off`}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleClear}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 max-w-sm">
          <Input
            placeholder="Enter code"
            value={code}
            onChange={(e) => {
              onCodeChange(e.target.value.toUpperCase());
              setStatus("idle");
            }}
            className="uppercase"
          />
          <Button onClick={handleApply} disabled={!code} size="sm">
            Apply
          </Button>
        </div>
      )}
      {status === "error" && (
        <p className="text-xs text-destructive">Invalid or expired code</p>
      )}
    </div>
  );
};

export default DiscountCode;

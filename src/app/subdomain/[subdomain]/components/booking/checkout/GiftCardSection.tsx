import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppliedGiftCard } from "./useGiftCard";

interface GiftCardSectionProps {
  giftCardCode: string;
  isApplyingGiftCard: boolean;
  appliedGiftCard: AppliedGiftCard | null;
  giftCardError: string;
  onChange: (code: string) => void;
  onApply: () => void;
  onRemove: () => void;
}

export const GiftCardSection = ({
  giftCardCode,
  isApplyingGiftCard,
  appliedGiftCard,
  giftCardError,
  onChange,
  onApply,
  onRemove,
}: GiftCardSectionProps) => (
  <div className="rounded-xl border bg-card p-4 space-y-3">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      Gift Card Redemption (Optional)
    </p>
    <div className="flex gap-2">
      <Input
        value={giftCardCode}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="Enter gift card code"
        className="uppercase"
        disabled={isApplyingGiftCard}
      />
      {appliedGiftCard?.code ? (
        <Button type="button" variant="outline" onClick={onRemove}>
          Remove
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onApply}
          disabled={!giftCardCode.trim() || isApplyingGiftCard}
        >
          {isApplyingGiftCard ? "Applying..." : "Apply"}
        </Button>
      )}
    </div>
    {appliedGiftCard && (
      <p className="text-xs text-emerald-600">
        {appliedGiftCard.maskedCode} applied. Available balance: $
        {appliedGiftCard.balance.toFixed(2)}
      </p>
    )}
    {giftCardError && (
      <p className="text-xs text-destructive">{giftCardError}</p>
    )}
  </div>
);

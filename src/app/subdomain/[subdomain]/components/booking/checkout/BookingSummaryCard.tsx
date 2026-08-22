import { Clock, Timer } from "lucide-react";
import { addMinutes, format, parse } from "date-fns";
import { CartItem } from "../../../data/types";

interface BookingSummaryCardProps {
  cart: CartItem[];
  shopFee: number;
  serviceFeeRate: number;
  tax: number;
  taxRate: number;
  isTaxEnabled?: boolean;
  giftCardRedeemedPreview: number;
  adjustedGrandTotal: number;
  effectiveDepositDue: number;
  selectedDate: Date | null;
  selectedSlot: { time: string; label: string } | null;
  cartDurationMinutes: number;
}

export const BookingSummaryCard = ({
  cart,
  shopFee,
  serviceFeeRate,
  tax,
  taxRate,
  isTaxEnabled = true,
  giftCardRedeemedPreview,
  adjustedGrandTotal,
  effectiveDepositDue,
  selectedDate,
  selectedSlot,
  cartDurationMinutes,
}: BookingSummaryCardProps) => (
  <div className="rounded-xl border bg-card p-4 space-y-3">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      Booking Summary
    </p>
    {cart.map((item) => {
      const vehicleExtra =
        item.service.vehicleTypePricing[
          item.vehicleType.toLowerCase() as keyof typeof item.service.vehicleTypePricing
        ] ?? 0;
      const itemPrice = (item.service.price + vehicleExtra) * item.quantity;
      return (
        <div key={item.service.id} className="flex justify-between text-sm">
          <span>
            {item.service.title}{" "}
            <span className="text-xs text-muted-foreground">
              ({item.vehicleType})
            </span>
          </span>
          <span className="font-medium">${itemPrice}</span>
        </div>
      );
    })}
    <div className="border-t pt-2 space-y-1">
      {shopFee > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Shop Fee ({serviceFeeRate}%)</span>
          <span>${shopFee}</span>
        </div>
      )}
      {isTaxEnabled && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Tax ({taxRate}%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
      )}
      {giftCardRedeemedPreview > 0 && (
        <div className="flex justify-between text-xs text-emerald-600">
          <span>Gift Card Applied</span>
          <span>-${giftCardRedeemedPreview.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold">
        <span>Total</span>
        <span>${adjustedGrandTotal.toFixed(2)}</span>
      </div>
      {effectiveDepositDue > 0 && (
        <div className="flex justify-between text-xs text-primary">
          <span>Deposit Due Now</span>
          <span>${effectiveDepositDue.toFixed(2)}</span>
        </div>
      )}
    </div>
    <div className="flex items-center flex-wrap gap-4 text-xs text-muted-foreground pt-1">
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {selectedDate ? format(selectedDate, "MMM d, yyyy") : ""}
      </span>
      {selectedSlot && (
        <span className="flex items-center gap-1">
          {selectedSlot.label} –{" "}
          {(() => {
            const start = parse(selectedSlot.time, "HH:mm", new Date());
            return format(addMinutes(start, cartDurationMinutes), "h:mm a");
          })()}
        </span>
      )}
      <span className="flex items-center gap-1">
        <Timer className="w-3 h-3" />
        {cartDurationMinutes >= 60
          ? `${Math.floor(cartDurationMinutes / 60)}h ${cartDurationMinutes % 60 > 0 ? `${cartDurationMinutes % 60}m` : ""}`
          : `${cartDurationMinutes}m`}
      </span>
    </div>
  </div>
);

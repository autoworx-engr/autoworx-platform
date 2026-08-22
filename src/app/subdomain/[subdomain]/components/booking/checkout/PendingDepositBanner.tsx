import { Button } from "@/components/ui/button";

interface PendingDepositBannerProps {
  showPayNowModal: boolean;
  onOpenPayNow: () => void;
}

export const PendingDepositBanner = ({
  showPayNowModal,
  onOpenPayNow,
}: PendingDepositBannerProps) => (
  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
    <p className="text-sm font-semibold">Deposit payment required</p>
    <p className="text-xs text-muted-foreground">
      Your booking is saved as pending. Complete the deposit to confirm your
      appointment.
    </p>
    <Button type="button" className="w-full" onClick={onOpenPayNow}>
      {showPayNowModal ? "Complete Payment in Open Modal" : "Open Pay Now"}
    </Button>
  </div>
);

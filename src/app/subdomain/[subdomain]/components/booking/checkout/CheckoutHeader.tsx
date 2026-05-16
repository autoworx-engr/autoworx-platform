import { Button } from "@/components/ui/button";
import { ArrowLeft, Timer } from "lucide-react";

interface CheckoutHeaderProps {
  timeLeft: number;
  formatTime: (s: number) => string;
  onBack: () => void;
}

export const CheckoutHeader = ({
  timeLeft,
  formatTime,
  onBack,
}: CheckoutHeaderProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <h2 className="text-2xl font-bold tracking-tight">Checkout</h2>
    </div>
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${timeLeft < 120 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
    >
      <Timer className="w-3.5 h-3.5" />
      {formatTime(timeLeft)}
    </div>
  </div>
);

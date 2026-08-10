import { useState } from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";
import { GiftCardAmountPresets } from "../../data/gift-card-types";

interface Props {
  presets: GiftCardAmountPresets;
  amount: number;
  onAmountChange: (amount: number) => void;
}

const AmountSelector = ({ presets, amount, onAmountChange }: Props) => {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [error, setError] = useState("");

  const presetValues = presets.showPresets
    ? [presets.preset1, presets.preset2, presets.preset3]
    : [];

  const selectPreset = (val: number) => {
    setIsCustom(false);
    setError("");
    onAmountChange(val);
  };

  const handleCustom = (raw: string) => {
    setCustomValue(raw);
    const num = parseFloat(raw);
    if (isNaN(num) || num <= 0) {
      setError("Enter a valid amount");
      onAmountChange(0);
    } else if (num < presets.customMin) {
      setError(`Minimum $${presets.customMin}`);
      onAmountChange(0);
    } else if (num > presets.customMax) {
      setError(`Maximum $${presets.customMax.toLocaleString()}`);
      onAmountChange(0);
    } else {
      setError("");
      onAmountChange(num);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3
          className="text-lg font-semibold tracking-tight mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Choose Amount
        </h3>
        <p className="text-sm text-muted-foreground">
          Select a preset or enter a custom amount
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {presetValues.map((v) => (
          <button
            key={v}
            onClick={() => selectPreset(v)}
            className={cn(
              "flex items-center justify-center gap-1 h-14 rounded-xl border-2 font-semibold text-lg transition-all",
              amount === v && !isCustom
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-muted-foreground/40",
            )}
          >
            ${v}
          </button>
        ))}
        {presets.customEnabled && (
          <button
            onClick={() => {
              setIsCustom(true);
              onAmountChange(0);
            }}
            className={cn(
              "flex items-center justify-center gap-1 h-14 rounded-xl border-2 font-medium transition-all",
              isCustom
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-muted-foreground/40",
            )}
          >
            Custom
          </button>
        )}
      </div>
      {isCustom && (
        <div className="space-y-1.5">
          <div className="relative max-w-xs">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              placeholder={`${presets.customMin} – ${presets.customMax.toLocaleString()}`}
              value={customValue}
              onChange={(e) => handleCustom(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default AmountSelector;

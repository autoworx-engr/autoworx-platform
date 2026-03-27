import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { CreditCard, RefreshCw, Shield, Loader2 } from "lucide-react";
import AmountSelector from "./AmountSelector";
import { GiftCardAmountPresets } from "../../data/gift-card-types";
import axios from "axios";

interface Props {
  presets: GiftCardAmountPresets;
}

const ReloadGiftCard = ({ presets }: Props) => {
  const [code, setCode] = useState("");

  const [looked, setLooked] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [found, setFound] = useState<{
    maskedCode: string;
    balance: number;
    status: string;
  } | null>(null);

  const [amount, setAmount] = useState(0);
  const [success, setSuccess] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [reloadError, setReloadError] = useState("");

  const handleLookup = async () => {
    if (!code) return;
    setLookingUp(true);
    setLooked(false);
    setLookupError("");
    setFound(null);

    try {
      const res = await axios.get(
        "/api/virtual-shop/issued-gift-card/check-balance",
        {
          params: { code: code.trim().toUpperCase() },
        },
      );
      if (res.data.success) {
        setFound(res.data.data);
      }
    } catch (err: any) {
      setLookupError(
        err.response?.data?.message ||
          "Failed to find gift card. Please check the code.",
      );
    } finally {
      setLookingUp(false);
      setLooked(true);
    }
  };

  const handleReload = async () => {
    if (!code || amount <= 0) return;
    setReloading(true);
    setReloadError("");

    try {
      const res = await axios.post(
        "/api/virtual-shop/issued-gift-card/reload",
        {
          code: code.trim().toUpperCase(),
          amount: amount,
        },
      );
      if (res.data.success) {
        setFound({
          ...found!,
          balance: res.data.data.balance,
          status: res.data.data.status,
        });
        setSuccess(true);
      }
    } catch (err: any) {
      setReloadError(
        err.response?.data?.message || "Failed to reload gift card.",
      );
    } finally {
      setReloading(false);
    }
  };

  const resetAll = () => {
    setCode("");
    setLooked(false);
    setFound(null);
    setAmount(0);
    setSuccess(false);
    setLookupError("");
    setReloadError("");
  };

  if (success && found) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 py-12">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <RefreshCw className="w-7 h-7 text-primary" />
        </div>
        <h3
          className="text-xl font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Reload Successful!
        </h3>
        <p className="text-muted-foreground text-sm">
          Added ${amount.toFixed(2)} to gift card {found.maskedCode}
        </p>
        <p className="text-sm font-medium">
          New balance: ${found.balance.toFixed(2)}
        </p>
        <Button variant="outline" onClick={resetAll}>
          Reload Another
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h3
          className="text-lg font-semibold tracking-tight mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Reload a Gift Card
        </h3>
        <p className="text-sm text-muted-foreground">
          Add funds to an existing gift card
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Enter gift card code (e.g. AWX-7F3K-9M2P)"
          value={code}
          onChange={e => {
            setCode(e.target.value.toUpperCase());
            setLooked(false);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") handleLookup();
          }}
          className="uppercase font-mono"
        />
        <Button
          onClick={handleLookup}
          disabled={!code || lookingUp}
          size="sm"
          className="min-w-[80px]"
        >
          {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lookup"}
        </Button>
      </div>

      {looked && lookupError && (
        <p className="text-sm text-destructive">{lookupError}</p>
      )}

      {looked && found && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Card</span>
              <span className="font-mono">{found.maskedCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Balance</span>
              <span className="font-semibold text-primary">
                ${found.balance.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {found.status.toLowerCase()}
              </Badge>
            </div>
          </div>

          <AmountSelector
            presets={presets}
            amount={amount}
            onAmountChange={setAmount}
          />

          {found.status !== "ACTIVE" && (
            <p className="text-sm text-destructive font-medium text-center">
              Cannot reload a {found.status.toLowerCase()} gift card. Status
              must be active.
            </p>
          )}

          {reloadError && (
            <p className="text-sm text-destructive font-medium">
              {reloadError}
            </p>
          )}

          <Button
            className="w-full h-12 gap-2"
            disabled={amount <= 0 || reloading || found.status !== "ACTIVE"}
            onClick={handleReload}
          >
            {reloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            {reloading
              ? "Processing..."
              : `Reload ${amount > 0 ? "$" + amount.toFixed(2) : "$0.00"}`}
          </Button>

          <div className="flex items-center gap-2 text-sm text-primary justify-center">
            <Shield className="w-4 h-4" />
            <span className="font-medium">Gift cards never expire</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReloadGiftCard;

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Search, Shield, Wallet, Loader2 } from "lucide-react";
import axios from "axios";
import { useParams } from "next/navigation";
import { useGetShopBySlug } from "@/hooks/virtual-shop/service/useShopService";

const CheckBalance = () => {
  const params = useParams();
  const slug = String(params?.subdomain || "");
  const { data: shop } = useGetShopBySlug(slug);

  const [code, setCode] = useState("");
  const [looked, setLooked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<{
    maskedCode: string;
    balance: number;
    amount: number;
    status: string;
  } | null>(null);

  const handleCheck = async () => {
    if (!code) return;

    setLoading(true);
    setLooked(false);
    setError("");
    setFound(null);

    try {
      const res = await axios.get(
        "/api/virtual-shop/issued-gift-card/check-balance",
        {
          params: {
            code: code.trim().toUpperCase(),
            shopId: shop?.id,
          },
        },
      );
      if (res.data.success) {
        setFound(res.data.data);
        setLooked(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to check balance.");
      setLooked(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h3
          className="text-lg font-semibold tracking-tight mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Check Balance
        </h3>
        <p className="text-sm text-muted-foreground">
          Enter your gift card code to view your balance
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Enter gift card code (e.g. AWX-7F3K-9M2P)"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setLooked(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCheck();
          }}
          className="uppercase font-mono"
        />
        <Button
          onClick={handleCheck}
          disabled={!code || loading}
          size="sm"
          className="gap-1.5 min-w-[80px]"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Search className="w-3.5 h-3.5" /> Check
            </>
          )}
        </Button>
      </div>

      {looked && error && <p className="text-sm text-destructive">{error}</p>}

      {looked && found && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-mono">
                {found.maskedCode}
              </p>
              <p
                className="text-3xl font-bold text-primary"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                ${found.balance.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Original Amount: ${found.amount.toFixed(2)}</span>
            <Badge variant="secondary" className="text-[10px] capitalize">
              {found.status.toLowerCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary pt-2 border-t">
            <Shield className="w-4 h-4" />
            <span className="font-medium">Gift cards never expire</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckBalance;

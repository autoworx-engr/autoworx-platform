import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PayNow } from "@/components/invoice-modal/PayNow";

import { CreditCard, RefreshCw, Shield, Loader2 } from "lucide-react";
import AmountSelector from "./AmountSelector";
import {
  GiftCardAmountPresets,
  GiftCardGatewayInfo,
} from "../../data/gift-card-types";
import axios from "axios";
import { errorToast, successToast } from "@/lib/toast";
import { useParams } from "next/navigation";
import { useGetShopBySlug } from "@/hooks/virtual-shop/service/useShopService";

interface Props {
  presets: GiftCardAmountPresets;
}

interface PendingGiftCardReloadCheckout {
  paymentRef: string;
  companyId: number;
  giftCardId: number;
  amount: number;
  code: string;
  maskedCode: string;
  gatewayInfo: GiftCardGatewayInfo;
}

const PENDING_RELOAD_STORAGE_KEY = "virtualShopGiftCardPendingReload";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ReloadGiftCard = ({ presets }: Props) => {
  const params = useParams();
  const slug = String(params?.subdomain || "");
  const { data: shop } = useGetShopBySlug(slug);

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
  const [lastReloadAmount, setLastReloadAmount] = useState(0);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [isFinalizingReload, setIsFinalizingReload] = useState(false);
  const [isResolvingReloadReturn, setIsResolvingReloadReturn] = useState(false);
  const [reloadError, setReloadError] = useState("");
  const [showPayNowModal, setShowPayNowModal] = useState(false);
  const [pendingCheckout, setPendingCheckout] =
    useState<PendingGiftCardReloadCheckout | null>(null);

  const persistPendingCheckout = (
    checkout: PendingGiftCardReloadCheckout | null,
  ) => {
    if (typeof window === "undefined") return;

    if (!checkout) {
      sessionStorage.removeItem(PENDING_RELOAD_STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(
      PENDING_RELOAD_STORAGE_KEY,
      JSON.stringify(checkout),
    );
  };

  const clearPendingCheckout = () => {
    setPendingCheckout(null);
    persistPendingCheckout(null);
  };

  const setReloadReturnContext = () => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("tab", "reload");
    url.searchParams.set("giftCardFlow", "reload");
    window.history.replaceState({}, "", url.toString());
  };

  const resolveReloadConfirmation = async (
    paymentRef: string,
    checkout?: PendingGiftCardReloadCheckout | null,
  ) => {
    setIsFinalizingReload(true);
    setReloadError("");

    try {
      for (let attempt = 0; attempt < 8; attempt++) {
        const response = await axios.post(
          "/api/virtual-shop/issued-gift-card/reload/confirmation",
          {
            paymentRef,
          },
        );

        if (!response.data?.success) {
          throw new Error(
            response.data?.message || "Failed to resolve gift card reload",
          );
        }

        const confirmation = response.data.data;
        if (confirmation?.status === "reloaded") {
          setFound({
            maskedCode: confirmation.maskedCode,
            balance: Number(confirmation.balance || 0),
            status: confirmation.giftCardStatus || "ACTIVE",
          });
          setLastReloadAmount(Number(confirmation.addedAmount || 0));
          setSuccess(true);
          setShowPayNowModal(false);
          clearPendingCheckout();
          successToast("Gift card reload complete.");
          return;
        }

        if (
          confirmation?.status === "paid" &&
          Number.isInteger(confirmation?.paymentId) &&
          Number(confirmation.paymentId) > 0 &&
          checkout
        ) {
          await finalizeReload(checkout, Number(confirmation.paymentId));
          return;
        }

        if (
          (confirmation?.status === "pending_payment" ||
            confirmation?.status === "processing") &&
          attempt < 7
        ) {
          await wait(1500);
          continue;
        }

        break;
      }

      successToast(
        "Payment succeeded. Reload confirmation is still processing. Please refresh shortly.",
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Payment succeeded, but we could not load reload confirmation yet.";
      setReloadError(message);
      errorToast(message);
    } finally {
      setIsFinalizingReload(false);
      setIsResolvingReloadReturn(false);
    }
  };

  const finalizeReload = async (
    checkout: PendingGiftCardReloadCheckout,
    paymentId: number,
  ) => {
    setIsFinalizingReload(true);
    setReloadError("");

    try {
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          const response = await axios.post(
            "/api/virtual-shop/issued-gift-card/reload",
            {
              code: checkout.code,
              paymentId,
            },
          );

          if (!response.data?.success) {
            throw new Error(
              response.data?.message || "Failed to reload gift card",
            );
          }

          const reloadData = response.data.data;
          setFound((prev) => ({
            maskedCode:
              reloadData.maskedCode || prev?.maskedCode || checkout.maskedCode,
            balance: Number(reloadData.balance || 0),
            status: reloadData.status || prev?.status || "ACTIVE",
          }));
          setLastReloadAmount(
            Number(reloadData.addedAmount || checkout.amount),
          );
          setSuccess(true);
          setShowPayNowModal(false);
          clearPendingCheckout();
          successToast("Gift card reload complete.");
          return;
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 409 && attempt < 7) {
            await wait(1500);
            continue;
          }

          throw error;
        }
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Payment was received, but reload confirmation is still pending. Please retry shortly.";
      setReloadError(message);
      errorToast(message);
    } finally {
      setIsFinalizingReload(false);
      setIsResolvingReloadReturn(false);
    }
  };

  const initiateReloadPayment = async () => {
    if (!code || amount <= 0) return;

    setIsInitiatingPayment(true);
    setReloadError("");

    try {
      const response = await axios.post(
        "/api/virtual-shop/issued-gift-card/reload-payment/initiate",
        {
          code: code.trim().toUpperCase(),
          amount,
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to start reload checkout",
        );
      }

      const checkout: PendingGiftCardReloadCheckout = {
        paymentRef: response.data.data.paymentRef,
        companyId: response.data.data.companyId,
        giftCardId: Number(response.data.data.giftCardId),
        amount: Number(response.data.data.amount),
        code: code.trim().toUpperCase(),
        maskedCode:
          response.data.data.maskedCode ||
          found?.maskedCode ||
          code.trim().toUpperCase(),
        gatewayInfo: response.data.data.gatewayInfo,
      };

      setPendingCheckout(checkout);
      persistPendingCheckout(checkout);
      setReloadReturnContext();
      setShowPayNowModal(true);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to initiate reload payment";
      setReloadError(message);
      errorToast(message);
    } finally {
      setIsInitiatingPayment(false);
    }
  };

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
          params: {
            code: code.trim().toUpperCase(),
            shopId: shop?.id,
          },
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
    await initiateReloadPayment();
  };

  const resetAll = () => {
    setCode("");
    setLooked(false);
    setFound(null);
    setAmount(0);
    setSuccess(false);
    setLastReloadAmount(0);
    setShowPayNowModal(false);
    setLookupError("");
    setReloadError("");
    clearPendingCheckout();
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedCheckout = sessionStorage.getItem(PENDING_RELOAD_STORAGE_KEY);
    if (!storedCheckout) return;

    try {
      const parsed = JSON.parse(
        storedCheckout,
      ) as PendingGiftCardReloadCheckout;
      setPendingCheckout(parsed);
      setCode(parsed.code);
    } catch {
      sessionStorage.removeItem(PENDING_RELOAD_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentUrl = new URL(window.location.href);
    const isSuccess = currentUrl.searchParams.get("success") === "true";
    const isCancelled = currentUrl.searchParams.get("cancel") === "true";
    const flow = currentUrl.searchParams.get("giftCardFlow");
    const paymentRefFromUrl =
      currentUrl.searchParams.get("paymentRef") ||
      currentUrl.searchParams.get("paymentId") ||
      "";
    const hasPaymentRef = Boolean(paymentRefFromUrl);

    if (!isSuccess && !isCancelled) return;
    if (flow === "purchase") return;
    if (isSuccess) {
      setIsResolvingReloadReturn(true);
    }

    currentUrl.searchParams.delete("success");
    currentUrl.searchParams.delete("cancel");
    currentUrl.searchParams.delete("session_id");
    currentUrl.searchParams.delete("paymentRef");
    currentUrl.searchParams.delete("paymentId");
    currentUrl.searchParams.delete("giftCardFlow");

    const nextUrl = `${currentUrl.pathname}${
      currentUrl.searchParams.toString()
        ? `?${currentUrl.searchParams.toString()}`
        : ""
    }${currentUrl.hash}`;
    window.history.replaceState({}, "", nextUrl);

    const storedCheckout = sessionStorage.getItem(PENDING_RELOAD_STORAGE_KEY);
    if (!storedCheckout) {
      if (isSuccess) {
        if (hasPaymentRef) {
          void resolveReloadConfirmation(paymentRefFromUrl, null);
        } else {
          const message =
            "Payment succeeded but reload checkout data was not found";
          setReloadError(message);
          errorToast(message);
          setIsResolvingReloadReturn(false);
        }
      } else {
        setIsResolvingReloadReturn(false);
      }
      return;
    }

    try {
      const parsed = JSON.parse(
        storedCheckout,
      ) as PendingGiftCardReloadCheckout;
      setPendingCheckout(parsed);
      setCode(parsed.code);

      if (isCancelled) {
        clearPendingCheckout();
        setShowPayNowModal(false);
        errorToast("Payment was cancelled");
        setIsResolvingReloadReturn(false);
        return;
      }

      if (isSuccess) {
        if (hasPaymentRef) {
          void resolveReloadConfirmation(paymentRefFromUrl, parsed);
        } else {
          setIsResolvingReloadReturn(false);
          const message = "Payment reference was not found";
          setReloadError(message);
          errorToast(message);
        }
      }
    } catch {
      clearPendingCheckout();
      const message = "Unable to restore gift card reload checkout session";
      setReloadError(message);
      errorToast(message);
      setIsResolvingReloadReturn(false);
    }
  }, []);

  const isProcessing = isInitiatingPayment || isFinalizingReload;

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
          Added ${(lastReloadAmount || amount).toFixed(2)} to gift card{" "}
          {found.maskedCode}
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

  if (isResolvingReloadReturn) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 py-12">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
        <p className="text-base font-medium">Processing payment...</p>
        <p className="text-sm text-muted-foreground">
          Please wait while we finalize your gift card reload.
        </p>
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
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setLooked(false);
          }}
          onKeyDown={(e) => {
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
            disabled={amount <= 0 || isProcessing || found.status !== "ACTIVE"}
            onClick={handleReload}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            {isFinalizingReload
              ? "Confirming payment..."
              : isInitiatingPayment
                ? "Starting checkout..."
                : `Reload ${amount > 0 ? "$" + amount.toFixed(2) : "$0.00"}`}
          </Button>

          <div className="flex items-center gap-2 text-sm text-primary justify-center">
            <Shield className="w-4 h-4" />
            <span className="font-medium">Gift cards never expire</span>
          </div>
        </div>
      )}

      {pendingCheckout && (
        <PayNow
          due={pendingCheckout.amount.toFixed(2)}
          paymentId={pendingCheckout.paymentRef}
          giftCardSource="reload"
          giftCardCode={pendingCheckout.code}
          giftCardId={pendingCheckout.giftCardId}
          companyId={pendingCheckout.companyId}
          mode="virtual_shop_gift_card"
          open={showPayNowModal}
          setOpen={setShowPayNowModal}
          gatewayInfo={pendingCheckout.gatewayInfo}
          onSuccess={() => {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set("tab", "reload");
            currentUrl.searchParams.set("giftCardFlow", "reload");
            currentUrl.searchParams.set("success", "true");
            currentUrl.searchParams.set(
              "paymentRef",
              pendingCheckout.paymentRef,
            );
            window.location.href = currentUrl.toString();
          }}
        />
      )}
    </div>
  );
};

export default ReloadGiftCard;

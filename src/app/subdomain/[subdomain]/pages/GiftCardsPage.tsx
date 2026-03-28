"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import { PayNow } from "@/components/invoice-modal/PayNow";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errorToast, successToast } from "@/lib/toast";
import { Loader2, RefreshCw, Search, ShoppingBag } from "lucide-react";
import { useParams } from "next/navigation";
import { BookingHeader } from "../components/booking/BookingHeader";
import AmountSelector from "../components/giftcards/AmountSelector";
import CheckBalance from "../components/giftcards/CheckBalance";
import DesignPicker from "../components/giftcards/DesignPicker";
import DiscountCode from "../components/giftcards/DiscountCode";
import GiftCardCheckout from "../components/giftcards/GiftCardCheckout";
import GiftCardConfirmation from "../components/giftcards/GiftCardConfirmation";
import PurchaseTypeSelector from "../components/giftcards/PurchaseTypeSelector";
import RecipientDetails from "../components/giftcards/RecipientDetails";
import ReloadGiftCard from "../components/giftcards/ReloadGiftCard";
import {
  GiftCardGatewayInfo,
  GiftCardPurchaseData,
  GiftCardSettings,
  initialPurchaseData,
} from "../data/gift-card-types";

type BuyStep =
  | "design"
  | "type"
  | "amount"
  | "discount"
  | "recipient"
  | "checkout"
  | "confirmation";

type ApiPurchaseType = "INDIVIDUAL" | "MULTIPLE_RECIPIENTS" | "GROUP_GIFT";
type ApiDeliveryMethod = "EMAIL" | "SMS" | "BOTH";

interface GiftCardCheckoutPayload {
  shopId: number;
  templateId: number;
  purchaseType: ApiPurchaseType;
  amount: number;
  promoCode?: string;
  purchaserName: string;
  purchaserEmail: string;
  purchaserPhone?: string;
  isSendToMyself: boolean;
  deliveryMethod: ApiDeliveryMethod;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  scheduledSendAt?: string;
  message?: string;
}

interface PendingGiftCardCheckout {
  paymentId: number;
  companyId: number;
  amount: number;
  gatewayInfo: GiftCardGatewayInfo;
  payload: GiftCardCheckoutPayload;
}

const PENDING_CHECKOUT_STORAGE_KEY = "virtualShopGiftCardPendingCheckout";

const toApiPurchaseType = (
  purchaseType: GiftCardPurchaseData["purchaseType"],
): ApiPurchaseType => {
  if (purchaseType === "multiple") return "MULTIPLE_RECIPIENTS";
  if (purchaseType === "group") return "GROUP_GIFT";
  return "INDIVIDUAL";
};

const toApiDeliveryMethod = (
  deliveryMethod: GiftCardPurchaseData["deliveryMethod"],
): ApiDeliveryMethod => {
  if (deliveryMethod === "text") return "SMS";
  return "EMAIL";
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const GiftCardsPage = () => {
  const { subdomain } = useParams();
  const [settings, setSettings] = useState<GiftCardSettings | null>(null);
  const [shopName, setShopName] = useState("Shop");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [buyStep, setBuyStep] = useState<BuyStep>("design");
  const [data, setData] = useState<GiftCardPurchaseData>(initialPurchaseData);
  const [showPayNowModal, setShowPayNowModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pendingCheckout, setPendingCheckout] =
    useState<PendingGiftCardCheckout | null>(null);

  const [confirmationData, setConfirmationData] = useState<{
    number: string;
    code: string;
  } | null>(null);

  const update = (partial: Partial<GiftCardPurchaseData>) =>
    setData((prev) => ({ ...prev, ...partial }));

  const persistPendingCheckout = (checkout: PendingGiftCardCheckout | null) => {
    if (typeof window === "undefined") return;
    if (!checkout) {
      sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(
      PENDING_CHECKOUT_STORAGE_KEY,
      JSON.stringify(checkout),
    );
  };

  const clearPendingCheckout = () => {
    setPendingCheckout(null);
    persistPendingCheckout(null);
  };

  const buildCheckoutPayload = (): GiftCardCheckoutPayload | null => {
    if (!settings?.shop?.id) return null;
    const templateId = Number(data.designId);
    if (!templateId || Number.isNaN(templateId)) return null;

    const normalizedPromoCode =
      data.discountApplied?.code || data.discountCode.trim();
    const deliveryMethod = toApiDeliveryMethod(data.deliveryMethod);
    const recipientEmail =
      data.sendToSelf || deliveryMethod === "EMAIL"
        ? data.sendToSelf
          ? data.buyerEmail
          : data.recipientContact
        : "";
    const recipientPhone =
      data.sendToSelf || deliveryMethod === "SMS"
        ? data.sendToSelf
          ? data.buyerPhone
          : data.recipientContact
        : "";

    const scheduledSendAt =
      data.sendTiming === "scheduled" && data.scheduledDate
        ? new Date(
            `${data.scheduledDate.toISOString().split("T")[0]}T${
              data.scheduledTime || "09:00"
            }:00`,
          ).toISOString()
        : undefined;

    return {
      shopId: settings.shop.id,
      templateId,
      purchaseType: toApiPurchaseType(data.purchaseType),
      amount: data.amount,
      promoCode: normalizedPromoCode || undefined,
      purchaserName: data.buyerName,
      purchaserEmail: data.buyerEmail,
      purchaserPhone: data.buyerPhone || undefined,
      isSendToMyself: data.sendToSelf,
      deliveryMethod,
      recipientName: data.sendToSelf ? data.buyerName : data.recipientName,
      recipientEmail: recipientEmail || undefined,
      recipientPhone: recipientPhone || undefined,
      scheduledSendAt,
      message: data.personalMessage || undefined,
    };
  };

  const finalizePurchase = async (checkout: PendingGiftCardCheckout) => {
    setIsProcessingPayment(true);
    try {
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          const response = await axios.post("/api/virtual-shop/buy-gift-card", {
            ...checkout.payload,
            paymentId: checkout.paymentId,
          });

          if (!response.data?.success) {
            throw new Error(
              response.data?.message || "Failed to issue gift card",
            );
          }

          const purchaseData = response.data.data;
          setConfirmationData({
            number: purchaseData.confirmationNumber,
            code: purchaseData.maskedCode,
          });
          setBuyStep("confirmation");
          clearPendingCheckout();
          setShowPayNowModal(false);
          successToast("Gift card purchase complete.");
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
      errorToast(
        error?.response?.data?.message ||
          "Payment was received, but confirmation is still pending. Please retry in a moment.",
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const initiatePayment = async () => {
    const payload = buildCheckoutPayload();
    if (!payload) {
      errorToast("Gift card details are incomplete");
      return;
    }

    setIsProcessingPayment(true);
    try {
      const response = await axios.post(
        "/api/virtual-shop/gift-card-payment/initiate",
        payload,
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to start checkout");
      }

      const checkout: PendingGiftCardCheckout = {
        paymentId: response.data.data.paymentId,
        companyId: response.data.data.companyId,
        amount: Number(response.data.data.amount),
        gatewayInfo: response.data.data.gatewayInfo,
        payload,
      };

      setPendingCheckout(checkout);
      persistPendingCheckout(checkout);
      setShowPayNowModal(true);
    } catch (error: any) {
      errorToast(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to initiate payment",
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleConfirmPurchase = async () => {
    await initiatePayment();
  };

  useEffect(() => {
    const fetchSettings = async () => {
      if (!subdomain) return;

      try {
        setLoading(true);
        const res = await axios.get(
          "/api/virtual-shop/gift-card-settings/public",
          {
            params: { slug: subdomain },
          },
        );

        if (res.data.success) {
          const fetchedSettings = res.data.data as GiftCardSettings;
          setSettings(fetchedSettings);
          setShopName(fetchedSettings.shop?.storeName || "Shop");
          setData((prev) => ({
            ...prev,
            designId:
              fetchedSettings.designs.find((d) => d.isDefault)?.id ||
              fetchedSettings.designs[0]?.id ||
              "",
            deliveryMethod: fetchedSettings.delivery.defaultMethod,
          }));

          const storedCheckout = sessionStorage.getItem(
            PENDING_CHECKOUT_STORAGE_KEY,
          );
          if (storedCheckout) {
            try {
              const parsed = JSON.parse(
                storedCheckout,
              ) as PendingGiftCardCheckout;
              setPendingCheckout(parsed);
            } catch {
              sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
            }
          }
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            "Failed to load gift card configurations.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [subdomain]);

  useEffect(() => {
    if (!settings || typeof window === "undefined") return;

    const currentUrl = new URL(window.location.href);
    const isSuccess = currentUrl.searchParams.get("success") === "true";
    const isCancelled = currentUrl.searchParams.get("cancel") === "true";

    if (!isSuccess && !isCancelled) return;

    currentUrl.searchParams.delete("success");
    currentUrl.searchParams.delete("cancel");
    currentUrl.searchParams.delete("session_id");

    const nextUrl = `${currentUrl.pathname}${
      currentUrl.searchParams.toString()
        ? `?${currentUrl.searchParams.toString()}`
        : ""
    }${currentUrl.hash}`;
    window.history.replaceState({}, "", nextUrl);

    const storedCheckout = sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (!storedCheckout) {
      if (isSuccess) {
        errorToast("Payment succeeded but checkout data was not found");
      }
      return;
    }

    try {
      const parsed = JSON.parse(storedCheckout) as PendingGiftCardCheckout;
      setPendingCheckout(parsed);

      if (isCancelled) {
        clearPendingCheckout();
        setShowPayNowModal(false);
        errorToast("Payment was cancelled");
        return;
      }

      if (isSuccess) {
        void finalizePurchase(parsed);
      }
    } catch {
      clearPendingCheckout();
      errorToast("Unable to restore gift card checkout session");
    }
  }, [settings]);

  const resetBuy = () => {
    setBuyStep("design");
    setData({
      ...initialPurchaseData,
      designId:
        settings?.designs.find((d) => d.isDefault)?.id ||
        settings?.designs[0]?.id ||
        "",
      deliveryMethod: settings?.delivery.defaultMethod || "email",
    });
    setConfirmationData(null);
    setShowPayNowModal(false);
    clearPendingCheckout();
  };

  const stepOrder: BuyStep[] = [
    "design",
    "type",
    "amount",
    "discount",
    "recipient",
    "checkout",
  ];
  const currentIdx = stepOrder.indexOf(buyStep);

  const canNext = () => {
    switch (buyStep) {
      case "design":
        return !!data.designId;
      case "type":
        return data.purchaseType === "individual";
      case "amount":
        return data.amount > 0;
      case "discount":
        return true;
      case "recipient":
        if (data.sendToSelf) return !!(data.buyerName && data.buyerEmail);
        const hasContact =
          data.deliveryMethod === "email"
            ? !!data.recipientContact
            : !!data.recipientContact && data.a2pConsent;
        return !!(data.buyerName && data.buyerEmail && hasContact);
      case "checkout":
        return data.purchaseConsent;
      default:
        return false;
    }
  };

  const stepLabels: Record<BuyStep, string> = {
    design: "Design",
    type: "Type",
    amount: "Amount",
    discount: "Discount",
    recipient: "Details",
    checkout: "Pay",
    confirmation: "Done",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">
          Loading gift card configurations...
        </p>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="w-12 h-12 bg-destructive/10 text-destructive flex flex-col items-center justify-center rounded-full">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-lg font-medium text-destructive">
          {error || "Gift cards not configured."}
        </p>
        <p className="text-muted-foreground text-sm max-w-sm">
          Please contact the shop owner to resolve configuration issues.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BookingHeader rightElement="booking" />

      <main className="container max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="buy" onValueChange={() => resetBuy()}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="buy" className="gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> Buy
            </TabsTrigger>
            <TabsTrigger value="reload" className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Reload
            </TabsTrigger>
            <TabsTrigger value="balance" className="gap-1.5">
              <Search className="w-3.5 h-3.5" /> Check Balance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy">
            {buyStep !== "confirmation" && (
              <>
                <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
                  {stepOrder.map((s, i) => (
                    <div key={s} className="flex items-center gap-1">
                      <button
                        onClick={() => i < currentIdx && setBuyStep(s)}
                        disabled={i > currentIdx || isProcessingPayment}
                        className={`text-xs px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                          s === buyStep
                            ? "bg-primary text-primary-foreground font-medium"
                            : i < currentIdx
                              ? "bg-muted text-foreground cursor-pointer hover:bg-muted-foreground/20"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {stepLabels[s]}
                      </button>
                      {i < stepOrder.length - 1 && (
                        <div className="w-4 h-px bg-border" />
                      )}
                    </div>
                  ))}
                </div>

                {buyStep === "design" && (
                  <DesignPicker
                    designs={settings.designs}
                    selected={data.designId}
                    onSelect={(id) => update({ designId: id })}
                    shopName={shopName}
                  />
                )}
                {buyStep === "type" && (
                  <PurchaseTypeSelector
                    selected={data.purchaseType}
                    onSelect={(t) => update({ purchaseType: t })}
                  />
                )}
                {buyStep === "amount" && (
                  <AmountSelector
                    presets={settings.amountPresets}
                    amount={data.amount}
                    onAmountChange={(a) => update({ amount: a })}
                  />
                )}
                {buyStep === "discount" && (
                  <DiscountCode
                    discounts={settings.discounts}
                    applied={data.discountApplied}
                    onApply={(d) => update({ discountApplied: d })}
                    onCodeChange={(c) => update({ discountCode: c })}
                    code={data.discountCode}
                  />
                )}
                {buyStep === "recipient" && (
                  <RecipientDetails
                    data={data}
                    onChange={update}
                    deliverySettings={settings.delivery}
                    shopName={shopName}
                  />
                )}
                {buyStep === "checkout" && (
                  <GiftCardCheckout
                    data={data}
                    design={settings.designs.find(
                      (d) => d.id === data.designId,
                    )}
                    policies={settings.policies}
                    shopName={shopName}
                    onConsentChange={(v) => update({ purchaseConsent: v })}
                    onConfirm={handleConfirmPurchase}
                    isProcessing={isProcessingPayment}
                  />
                )}

                {buyStep !== "checkout" && (
                  <div className="flex items-center justify-between mt-8 pt-4 border-t">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        currentIdx > 0 && setBuyStep(stepOrder[currentIdx - 1])
                      }
                      disabled={currentIdx === 0 || isProcessingPayment}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => setBuyStep(stepOrder[currentIdx + 1])}
                      disabled={!canNext() || isProcessingPayment}
                    >
                      Continue
                    </Button>
                  </div>
                )}
              </>
            )}

            {buyStep === "confirmation" && confirmationData && (
              <GiftCardConfirmation
                confirmationNumber={confirmationData.number}
                maskedCode={confirmationData.code}
                amount={data.amount}
                recipientName={data.sendToSelf ? "" : data.recipientName}
                deliveryMethod={data.sendToSelf ? "self" : data.deliveryMethod}
                sendTiming={data.sendTiming}
                shopName={shopName}
              />
            )}
          </TabsContent>

          <TabsContent value="reload">
            <ReloadGiftCard presets={settings.amountPresets} />
          </TabsContent>

          <TabsContent value="balance">
            <CheckBalance />
          </TabsContent>
        </Tabs>
      </main>

      {pendingCheckout && (
        <PayNow
          due={pendingCheckout.amount.toFixed(2)}
          paymentId={pendingCheckout.paymentId.toString()}
          companyId={pendingCheckout.companyId}
          mode="virtual_shop_gift_card"
          open={showPayNowModal}
          setOpen={setShowPayNowModal}
          gatewayInfo={pendingCheckout.gatewayInfo}
          onSuccess={() => {
            void finalizePurchase(pendingCheckout);
          }}
        />
      )}
    </div>
  );
};

export default GiftCardsPage;

"use client";

import { useState, useEffect } from "react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Search, ShoppingBag, Loader2 } from "lucide-react";
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
  GiftCardPurchaseData,
  initialPurchaseData,
  GiftCardSettings
} from "../data/gift-card-types";

type BuyStep =
  | "design"
  | "type"
  | "amount"
  | "discount"
  | "recipient"
  | "checkout"
  | "confirmation";

const GiftCardsPage = () => {
  const { subdomain } = useParams();
  const [settings, setSettings] = useState<GiftCardSettings | null>(null);
  const [shopName, setShopName] = useState("Shop");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [buyStep, setBuyStep] = useState<BuyStep>("design");
  const [data, setData] = useState<GiftCardPurchaseData>(initialPurchaseData);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!subdomain) return;
      try {
        setLoading(true);
        const res = await axios.get('/api/virtual-shop/gift-card-settings/public', {
          params: { slug: subdomain }
        });
        if (res.data.success) {
          const fetchedSettings = res.data.data;
          setSettings(fetchedSettings);
          setShopName(fetchedSettings.shop?.storeName || "Shop");
          setData(prev => ({
            ...prev,
            designId:
              fetchedSettings.designs.find((d: any) => d.isDefault)?.id ||
              fetchedSettings.designs[0]?.id ||
              "",
            deliveryMethod: fetchedSettings.delivery.defaultMethod,
          }));
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load gift card configurations.");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [subdomain]);

  const update = (partial: Partial<GiftCardPurchaseData>) =>
    setData(prev => ({ ...prev, ...partial }));

  const [confirmationData, setConfirmationData] = useState<{
    number: string;
    code: string;
  } | null>(null);

  const handleConfirmPurchase = () => {
    const confNum = `AWX-${Date.now().toString(36).toUpperCase()}`;
    const code = `AWX-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setConfirmationData({
      number: confNum,
      code: `AWX-****-${code.split("-").pop()}`,
    });
    setBuyStep("confirmation");
  };

  const resetBuy = () => {
    setBuyStep("design");
    setData({
      ...initialPurchaseData,
      designId:
        settings?.designs.find(d => d.isDefault)?.id ||
        settings?.designs[0]?.id ||
        "",
      deliveryMethod: settings?.delivery.defaultMethod || "email",
    });
    setConfirmationData(null);
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
        <p className="text-muted-foreground font-medium">Loading gift card configurations...</p>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="w-12 h-12 bg-destructive/10 text-destructive flex flex-col items-center justify-center rounded-full">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-lg font-medium text-destructive">{error || "Gift cards not configured."}</p>
        <p className="text-muted-foreground text-sm max-w-sm">
          Please contact the shop owner to resolve configuration issues.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

          {/* BUY TAB */}
          <TabsContent value="buy">
            {buyStep !== "confirmation" && (
              <>
                {/* Step indicator */}
                <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
                  {stepOrder.map((s, i) => (
                    <div key={s} className="flex items-center gap-1">
                      <button
                        onClick={() => i < currentIdx && setBuyStep(s)}
                        disabled={i > currentIdx}
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

                {/* Step content */}
                {buyStep === "design" && (
                  <DesignPicker
                    designs={settings.designs}
                    selected={data.designId}
                    onSelect={id => update({ designId: id })}
                    shopName={shopName}
                  />
                )}
                {buyStep === "type" && (
                  <PurchaseTypeSelector
                    selected={data.purchaseType}
                    onSelect={t => update({ purchaseType: t })}
                  />
                )}
                {buyStep === "amount" && (
                  <AmountSelector
                    presets={settings.amountPresets}
                    amount={data.amount}
                    onAmountChange={a => update({ amount: a })}
                  />
                )}
                {buyStep === "discount" && (
                  <DiscountCode
                    discounts={settings.discounts}
                    applied={data.discountApplied}
                    onApply={d => update({ discountApplied: d })}
                    onCodeChange={c => update({ discountCode: c })}
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
                    design={settings.designs.find(d => d.id === data.designId)}
                    policies={settings.policies}
                    shopName={shopName}
                    onConsentChange={v => update({ purchaseConsent: v })}
                    onConfirm={handleConfirmPurchase}
                  />
                )}

                {/* Nav buttons */}
                {buyStep !== "checkout" && (
                  <div className="flex items-center justify-between mt-8 pt-4 border-t">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        currentIdx > 0 && setBuyStep(stepOrder[currentIdx - 1])
                      }
                      disabled={currentIdx === 0}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => setBuyStep(stepOrder[currentIdx + 1])}
                      disabled={!canNext()}
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

          {/* RELOAD TAB */}
          <TabsContent value="reload">
            <ReloadGiftCard presets={settings.amountPresets} />
          </TabsContent>

          {/* BALANCE TAB */}
          <TabsContent value="balance">
            <CheckBalance />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default GiftCardsPage;

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  GiftCardPurchaseData,
  initialPurchaseData,
} from "../../data/gift-card-types";
import DesignPicker from "../../components/giftcards/DesignPicker";
import PurchaseTypeSelector from "../../components/giftcards/PurchaseTypeSelector";
import AmountSelector from "../../components/giftcards/AmountSelector";
import DiscountCode from "../../components/giftcards/DiscountCode";
import RecipientDetails from "../../components/giftcards/RecipientDetails";
import GiftCardCheckout from "../../components/giftcards/GiftCardCheckout";
import GiftCardConfirmation from "../../components/giftcards/GiftCardConfirmation";
import { useGiftCardPageData } from "../../hooks/useGiftCardPageData";
import { useBuyGiftCard } from "@/hooks/virtual-shop/gift-card-settings/useGiftCardSettings";
import toast from "react-hot-toast";

type BuyStep =
  | "design"
  | "type"
  | "amount"
  | "discount"
  | "recipient"
  | "checkout"
  | "confirmation";

const BuyGiftCardFlow = () => {
  const {
    designs,
    amountPresets,
    deliverySettings,
    policies,
    shopName,
    companyId,
    shop,
    isLoading,
  } = useGiftCardPageData();

  const buyGiftCardMutation = useBuyGiftCard();

  const [buyStep, setBuyStep] = useState<BuyStep>("design");
  const [data, setData] = useState<GiftCardPurchaseData>({
    ...initialPurchaseData,
    designId: designs.find((d) => d.isDefault)?.id || designs[0]?.id || "",
    deliveryMethod: deliverySettings.defaultMethod,
  });

  const [confirmationData, setConfirmationData] = useState<{
    number: string;
    code: string;
  } | null>(null);

  useEffect(() => {
    if (designs.length > 0 && !data.designId) {
      setData((prev) => ({
        ...prev,
        designId: designs.find((d) => d.isDefault)?.id || designs[0]?.id || "",
      }));
    }
    if (deliverySettings && !data.deliveryMethod) {
      setData((prev) => ({
        ...prev,
        deliveryMethod: deliverySettings.defaultMethod,
      }));
    }
  }, [designs, deliverySettings, data.designId, data.deliveryMethod]);

  const update = (partial: Partial<GiftCardPurchaseData>) =>
    setData((prev) => ({ ...prev, ...partial }));

  const handleConfirmPurchase = async () => {
    try {
      const payload = {
        shopId: Number(shop?.id),
        templateId: Number(data.designId),
        purchaseType: data.purchaseType.toUpperCase(),
        amount: data.amount,
        promoCode: data.discountCode,
        purchaserName: data.buyerName,
        purchaserEmail: data.buyerEmail,
        purchaserPhone: data.buyerPhone,
        isSendToMyself: data.sendToSelf,
        deliveryMethod: data.deliveryMethod.toUpperCase(),
        recipientName: data.sendToSelf ? data.buyerName : data.recipientName,
        recipientEmail: data.sendToSelf
          ? data.buyerEmail
          : data.deliveryMethod === "email"
            ? data.recipientContact
            : undefined,
        recipientPhone:
          !data.sendToSelf && data.deliveryMethod === "text"
            ? data.recipientContact
            : undefined,
        message: data.personalMessage,
      };

      const result = await buyGiftCardMutation.mutateAsync(payload);

      if (result.success) {
        setConfirmationData({
          number:
            result.data.id || `AWX-${Date.now().toString(36).toUpperCase()}`,
          code:
            result.data.maskedCode ||
            `AWX-****-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        });
        setBuyStep("confirmation");
      } else {
        toast.error(result.message || "Failed to purchase gift card");
      }
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong. Please try again.");
    }
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

  if (buyStep === "confirmation" && confirmationData) {
    return (
      <GiftCardConfirmation
        confirmationNumber={confirmationData.number}
        maskedCode={confirmationData.code}
        amount={data.amount}
        recipientName={data.sendToSelf ? "" : data.recipientName}
        deliveryMethod={data.sendToSelf ? "self" : data.deliveryMethod}
        sendTiming={data.sendTiming}
        shopName={shopName}
      />
    );
  }

  return (
    <>
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
            {i < stepOrder.length - 1 && <div className="w-4 h-px bg-border" />}
          </div>
        ))}
      </div>

      {buyStep === "design" && (
        <DesignPicker
          designs={designs}
          selected={data.designId}
          onSelect={(id) => update({ designId: id })}
          shopName={shopName}
          isLoading={isLoading}
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
          presets={amountPresets}
          amount={data.amount}
          onAmountChange={(a) => update({ amount: a })}
        />
      )}
      {buyStep === "discount" && (
        <DiscountCode
          discounts={[]}
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
          deliverySettings={deliverySettings}
          shopName={shopName}
        />
      )}
      {buyStep === "checkout" && (
        <GiftCardCheckout
          data={data}
          design={designs.find((d) => d.id === data.designId)}
          policies={policies}
          shopName={shopName}
          isPending={buyGiftCardMutation.isPending}
          onConsentChange={(v) => update({ purchaseConsent: v })}
          onConfirm={handleConfirmPurchase}
        />
      )}

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
  );
};

export default BuyGiftCardFlow;

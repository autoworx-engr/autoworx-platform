"use client";
import { useCallback, useState } from "react";
import axios from "axios";
import { errorToast, successToast } from "@/lib/toast";

export interface AppliedGiftCard {
  code: string;
  maskedCode: string;
  balance: number;
}

export const useGiftCard = ({ shopId }: { shopId?: number }) => {
  const [giftCardCode, setGiftCardCode] = useState("");
  const [isApplyingGiftCard, setIsApplyingGiftCard] = useState(false);
  const [giftCardError, setGiftCardError] = useState("");
  const [appliedGiftCard, setAppliedGiftCard] =
    useState<AppliedGiftCard | null>(null);

  const handleApplyGiftCard = useCallback(async () => {
    const normalizedCode = giftCardCode.trim().toUpperCase();
    if (!normalizedCode) {
      setGiftCardError("Please enter a gift card code");
      return;
    }
    setIsApplyingGiftCard(true);
    setGiftCardError("");
    try {
      const response = await axios.get(
        "/api/virtual-shop/issued-gift-card/check-balance",
        { params: { code: normalizedCode, shopId } },
      );
      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to validate gift card",
        );
      }
      const card = response.data?.data;
      const cardStatus = String(card?.status || "").toUpperCase();
      const balance = Number(card?.balance || 0);
      if (cardStatus !== "ACTIVE") {
        throw new Error(
          `Cannot redeem a ${cardStatus.toLowerCase()} gift card.`,
        );
      }
      if (!Number.isFinite(balance) || balance <= 0) {
        throw new Error("Gift card has no redeemable balance.");
      }
      setGiftCardCode(normalizedCode);
      setAppliedGiftCard({
        code: normalizedCode,
        maskedCode: card?.maskedCode || normalizedCode,
        balance,
      });
      setGiftCardError("");
      successToast("Gift card applied.");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to validate gift card";
      setGiftCardError(message);
      errorToast(message);
    } finally {
      setIsApplyingGiftCard(false);
    }
  }, [giftCardCode, shopId]);

  const clearAppliedGiftCard = useCallback(() => {
    setAppliedGiftCard(null);
    setGiftCardError("");
  }, []);

  return {
    giftCardCode,
    setGiftCardCode,
    isApplyingGiftCard,
    giftCardError,
    setGiftCardError,
    appliedGiftCard,
    handleApplyGiftCard,
    clearAppliedGiftCard,
  };
};

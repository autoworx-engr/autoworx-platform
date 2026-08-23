"use client";
import { CartItem } from "../../../data/types";
import { AppliedGiftCard } from "./useGiftCard";

interface ShopSettings {
  depositRequired: boolean;
  depositType: string;
  depositAmount: number;
  taxPercent: number;
  shopFeePercent: number;
  shopFeeEnabled: boolean;
  taxEnabled: boolean;
}

interface BookingSettings {
  isDepositEnabled?: boolean;
  depositType?: string;
  depositValue?: number | null;
  isServiceFeeEnabled?: boolean;
  isTaxEnabled?: boolean;
}

interface UseCheckoutTotalsProps {
  cart: CartItem[];
  bookingSettings?: BookingSettings | null;
  companyTax?: number | null;
  companyServiceFee?: number | null;
  settings: ShopSettings;
  appliedGiftCard: AppliedGiftCard | null;
  serverDepositRequired: number | null;
  createdBookingId: string;
}

export const useCheckoutTotals = ({
  cart,
  bookingSettings,
  companyTax,
  companyServiceFee,
  settings,
  appliedGiftCard,
  serverDepositRequired,
  createdBookingId,
}: UseCheckoutTotalsProps) => {
  const isDepositEnabled =
    bookingSettings?.isDepositEnabled ?? settings.depositRequired;
  const depositType = bookingSettings?.depositType
    ? bookingSettings.depositType.toLowerCase()
    : settings.depositType;
  const depositValueRaw =
    bookingSettings?.depositValue !== undefined &&
    bookingSettings?.depositValue !== null
      ? Number(bookingSettings.depositValue)
      : settings.depositAmount;
  const depositValue = Number.isFinite(depositValueRaw) ? depositValueRaw : 0;

  const serviceBaseTotal = cart.reduce(
    (sum, item) => sum + Number(item.service.price || 0) * item.quantity,
    0,
  );
  const vehicleExtraTotal = cart.reduce((sum, item) => {
    const vehicleExtra = Number(
      (item.service.vehicleTypePricing[
        item.vehicleType.toLowerCase() as keyof typeof item.service.vehicleTypePricing
      ] ??
        0) ||
        0,
    );
    return sum + vehicleExtra * item.quantity;
  }, 0);
  const subtotal = Number((serviceBaseTotal + vehicleExtraTotal).toFixed(2));

  // Tax base: material price only (labor is excluded), same as invoice/estimate
  const materialSubtotal = Number(
    cart
      .reduce(
        (sum, item) =>
          sum + Number(item.service.materialTotal || 0) * item.quantity,
        0,
      )
      .toFixed(2),
  );

  const taxRateRaw = companyTax ?? settings.taxPercent;
  const serviceFeeRateRaw = companyServiceFee ?? settings.shopFeePercent;
  const taxRate = Number.isFinite(Number(taxRateRaw)) ? Number(taxRateRaw) : 0;
  const serviceFeeRate = Number.isFinite(Number(serviceFeeRateRaw))
    ? Number(serviceFeeRateRaw)
    : 0;

  const isServiceFeeEnabled =
    bookingSettings?.isServiceFeeEnabled ?? settings.shopFeeEnabled;
  const isTaxEnabled = bookingSettings?.isTaxEnabled ?? settings.taxEnabled;

  const shopFee = isServiceFeeEnabled
    ? Number(((subtotal * serviceFeeRate) / 100).toFixed(2))
    : 0;
  const tax = isTaxEnabled
    ? Number(((materialSubtotal * taxRate) / 100).toFixed(2))
    : 0;
  const rawGrandTotal = Number((subtotal + shopFee + tax).toFixed(2));

  const calculatedDepositAmount = isDepositEnabled
    ? depositType === "fixed"
      ? depositValue
      : Number(((rawGrandTotal * depositValue) / 100).toFixed(2))
    : 0;
  const depositAmount = Number(
    Math.min(rawGrandTotal, Math.max(0, calculatedDepositAmount)).toFixed(2),
  );

  const giftCardTarget = depositAmount > 0 ? depositAmount : rawGrandTotal;
  const giftCardRedeemedPreview = appliedGiftCard
    ? Number(Math.min(appliedGiftCard.balance, giftCardTarget).toFixed(2))
    : 0;

  const grandTotal = Number(
    (rawGrandTotal - giftCardRedeemedPreview).toFixed(2),
  );
  const adjustedGrandTotal = grandTotal;

  const payableDeposit = Number(
    Math.max(0, depositAmount - giftCardRedeemedPreview).toFixed(2),
  );
  const effectiveDepositDue = serverDepositRequired ?? payableDeposit;
  const hasPendingBookingPayment =
    Boolean(createdBookingId) && effectiveDepositDue > 0;

  return {
    subtotal,
    materialSubtotal,
    shopFee,
    serviceFeeRate,
    tax,
    taxRate,
    rawGrandTotal,
    depositAmount,
    giftCardRedeemedPreview,
    grandTotal,
    adjustedGrandTotal,
    payableDeposit,
    effectiveDepositDue,
    hasPendingBookingPayment,
    isTaxEnabled,
    isServiceFeeEnabled,
    isDepositEnabled,
    depositType,
    depositValue,
  };
};

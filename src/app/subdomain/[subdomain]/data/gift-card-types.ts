export interface GiftCardDesign {
  id: string;
  name: string;
  imageUrl: string;
  enabled: boolean;
  isDefault: boolean;
}

export interface GiftCardAmountPresets {
  preset1: number;
  preset2: number;
  preset3: number;
  showPresets: boolean;
  customEnabled: boolean;
  customMin: number;
  customMax: number;
}

export interface GiftCardDeliverySettings {
  textEnabled: boolean;
  emailEnabled: boolean;
  defaultMethod: "text" | "email";
  scheduledSendEnabled: boolean;
}

export interface GiftCardDiscount {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
}

export interface GiftCardPolicies {
  termsUrl: string;
  privacyUrl: string;
}

export interface GiftCardGatewayInfo {
  paymentGateway: "STRIPE" | "AUTHORIZE_NET" | "BOTH";
  hasStripe: boolean;
  hasAuthorizeNet: boolean;
  tipEnabled?: boolean;
}

export interface GiftCardShopInfo {
  id: number;
  companyId: number;
  storeName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  company: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
  };
  gatewayInfo: GiftCardGatewayInfo;
}

export interface GiftCardSettings {
  shop: GiftCardShopInfo;
  designs: GiftCardDesign[];
  amountPresets: GiftCardAmountPresets;
  delivery: GiftCardDeliverySettings;
  discounts: GiftCardDiscount[];
  policies: GiftCardPolicies;
}

export type GiftCardPurchaseType = "individual" | "multiple" | "group";
export type GiftCardDeliveryMethod = "text" | "email";
export type GiftCardSendTiming = "instant" | "scheduled";

export interface GiftCardPurchaseData {
  designId: string;
  purchaseType: GiftCardPurchaseType;
  amount: number;
  discountCode: string;
  discountApplied: GiftCardDiscount | null;
  sendToSelf: boolean;
  deliveryMethod: GiftCardDeliveryMethod;
  sendTiming: GiftCardSendTiming;
  scheduledDate: Date | null;
  scheduledTime: string;
  recipientName: string;
  recipientContact: string; // phone or email
  personalMessage: string;
  a2pConsent: boolean;
  purchaseConsent: boolean;
  // buyer info
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
}

export interface GiftCardRecord {
  id: string;
  code: string;
  maskedCode: string;
  amount: number;
  balance: number;
  designId: string;
  buyerName: string;
  recipientName: string;
  deliveryMethod: GiftCardDeliveryMethod;
  status: "active" | "delivered" | "redeemed" | "cancelled";
  purchasedAt: string;
  deliveredAt: string | null;
}

export const initialPurchaseData: GiftCardPurchaseData = {
  designId: "",
  purchaseType: "individual",
  amount: 0,
  discountCode: "",
  discountApplied: null,
  sendToSelf: false,
  deliveryMethod: "email",
  sendTiming: "instant",
  scheduledDate: null,
  scheduledTime: "09:00",
  recipientName: "",
  recipientContact: "",
  personalMessage: "",
  a2pConsent: false,
  purchaseConsent: false,
  buyerName: "",
  buyerEmail: "",
  buyerPhone: "",
};

import { GiftCardSettings, GiftCardRecord } from "./gift-card-types";

export const defaultGiftCardSettings: GiftCardSettings = {
  shop: {
    id: 1,
    companyId: 1,
    storeName: "Autoworx Demo Shop",
    logoUrl: null,
    bannerUrl: null,
    company: {
      id: 1,
      name: "Autoworx Demo",
      phone: null,
      email: null,
    },
    gatewayInfo: {
      paymentGateway: "BOTH",
      hasStripe: true,
      hasAuthorizeNet: true,
    },
  },
  designs: [
    {
      id: "d1",
      name: "Classic Blue",
      imageUrl:
        "https://images.unsplash.com/photo-1557683316-973673baf926?w=600&h=340&fit=crop",
      enabled: true,
      isDefault: true,
    },
    {
      id: "d2",
      name: "Sunset Orange",
      imageUrl:
        "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=600&h=340&fit=crop",
      enabled: true,
      isDefault: false,
    },
    {
      id: "d3",
      name: "Dark Carbon",
      imageUrl:
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=340&fit=crop",
      enabled: true,
      isDefault: false,
    },
    {
      id: "d4",
      name: "Holiday Special",
      imageUrl:
        "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&h=340&fit=crop",
      enabled: true,
      isDefault: false,
    },
  ],
  amountPresets: {
    preset1: 50,
    preset2: 100,
    preset3: 200,
    showPresets: true,
    customEnabled: true,
    customMin: 25,
    customMax: 2000,
  },
  delivery: {
    textEnabled: true,
    emailEnabled: true,
    defaultMethod: "email",
    scheduledSendEnabled: true,
  },
  discounts: [
    {
      id: "dc1",
      code: "GIFT10",
      type: "percent",
      value: 10,
      expiryDate: "2026-12-31",
      usageLimit: 100,
      usedCount: 12,
    },
    {
      id: "dc2",
      code: "SAVE5",
      type: "fixed",
      value: 5,
      expiryDate: "2026-06-30",
      usageLimit: 50,
      usedCount: 3,
    },
  ],
  policies: {
    termsUrl: "#terms",
    privacyUrl: "#privacy",
  },
};

export const mockGiftCardRecords: GiftCardRecord[] = [
  {
    id: "gc1",
    code: "AWX-7F3K-9M2P",
    maskedCode: "AWX-****-9M2P",
    amount: 100,
    balance: 75,
    designId: "d1",
    buyerName: "John Doe",
    recipientName: "Jane Smith",
    deliveryMethod: "email",
    status: "active",
    purchasedAt: "2026-01-15T10:30:00Z",
    deliveredAt: "2026-01-15T10:31:00Z",
  },
  {
    id: "gc2",
    code: "AWX-2B8N-4X7R",
    maskedCode: "AWX-****-4X7R",
    amount: 200,
    balance: 200,
    designId: "d3",
    buyerName: "Alice Park",
    recipientName: "Bob Wilson",
    deliveryMethod: "text",
    status: "delivered",
    purchasedAt: "2026-02-10T14:00:00Z",
    deliveredAt: "2026-02-14T09:00:00Z",
  },
];

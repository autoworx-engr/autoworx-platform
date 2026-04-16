import {
  useGetGiftCardTemplatesPublic,
  useGetGiftCardSettingsByShopId,
} from "@/hooks/virtual-shop/gift-card-settings/useGiftCardSettings";
import { useShopInfo } from "@/hooks/virtual-shop/useShopInfo";
import { useMemo } from "react";
import {
  GiftCardDesign,
  GiftCardAmountPresets,
  GiftCardDeliverySettings,
  GiftCardPolicies,
  GiftCardDeliveryMethod,
} from "../data/gift-card-types";

export const useGiftCardPageData = (initialShop?: any) => {
  const {
    shop,
    shopName,
    companyId,
    shopId,
    isPending: isShopLoading,
  } = useShopInfo(initialShop);
  const { data: remoteTemplates, isLoading: isTemplatesLoading } =
    useGetGiftCardTemplatesPublic(shopId);
  const { data: remoteSettings, isLoading: isSettingsLoading } =
    useGetGiftCardSettingsByShopId(shopId);

  const amountPresets = useMemo<GiftCardAmountPresets>(() => {
    return {
      preset1: remoteSettings?.presetAmounts?.[0] ?? 0,
      preset2: remoteSettings?.presetAmounts?.[1] ?? 0,
      preset3: remoteSettings?.presetAmounts?.[2] ?? 0,
      showPresets: (remoteSettings?.presetAmounts?.length ?? 0) > 0,
      customEnabled: remoteSettings?.allowCustomAmount ?? false,
      customMin: Number(remoteSettings?.minCustomAmount) || 0,
      customMax: Number(remoteSettings?.maxCustomAmount) || 0,
    };
  }, [remoteSettings]);

  const deliverySettings = useMemo<GiftCardDeliverySettings>(() => {
    return {
      emailEnabled: remoteSettings?.allowEmailDelivery ?? false,
      textEnabled: remoteSettings?.allowSmsDelivery ?? false,
      defaultMethod:
        (remoteSettings?.defaultDelivery?.toLowerCase() as GiftCardDeliveryMethod) ??
        "email",
      scheduledSendEnabled: remoteSettings?.allowScheduledSend ?? false,
    };
  }, [remoteSettings]);

  const policies = useMemo<GiftCardPolicies>(() => {
    return {
      termsUrl: remoteSettings?.termsAndConditions || "",
      privacyUrl: remoteSettings?.privacyPolicy || "",
    };
  }, [remoteSettings]);

  const designs = useMemo<GiftCardDesign[]>(() => {
    if (!remoteTemplates || remoteTemplates.length === 0) return [];
    return remoteTemplates.map((t) => ({
      id: String(t.id),
      name: t.name,
      imageUrl: t.imageUrl,
      enabled: t.isActive,
      isDefault: t.isDefault,
    }));
  }, [remoteTemplates]);

  return {
    shop,
    shopName,
    companyId,
    shopId,
    designs,
    amountPresets,
    deliverySettings,
    policies,
    isLoading: isShopLoading || isTemplatesLoading || isSettingsLoading,
    remoteSettings,
  };
};

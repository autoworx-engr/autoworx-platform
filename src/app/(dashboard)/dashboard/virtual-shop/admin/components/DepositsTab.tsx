"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { Switch } from "@/components/Switch";
import { Button } from "@/components/ui/button";
import type { UpdateShopBookingSettingsPayload } from "@/service/virtual-shop/api";
import { useGetVirtualShopConfigure } from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import {
  useGetShopBookingSettings,
  useUpdateShopBookingSettings,
} from "@/hooks/virtual-shop/booking-settings/useShopBookingSettings";

export default function DepositsTab() {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId ?? 0;

  const { data: shopConfig, isLoading: isShopConfigLoading } =
    useGetVirtualShopConfigure(companyId);
  const shopId = Number(shopConfig?.id ?? 0);

  const [requireDeposit, setRequireDeposit] = useState(false);
  const {
    data: bookingSettings,
    isLoading: isBookingSettingsLoading,
  } = useGetShopBookingSettings(shopId);
  const { mutateAsync: updateBookingSettings, isPending: isSaving } =
    useUpdateShopBookingSettings(shopId);

  const isLoading = isShopConfigLoading || isBookingSettingsLoading;

  useEffect(() => {
    if (!bookingSettings) return;

    setRequireDeposit(Boolean(bookingSettings.isDepositEnabled));
  }, [bookingSettings]);

  const handleSave = async () => {
    if (!shopId) {
      toast.error("Shop is not configured yet");
      return;
    }

    if (!session?.accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }

    const normalizedDepositValue = Number(bookingSettings?.depositValue ?? 0);
    const payload: UpdateShopBookingSettingsPayload = {
      shopId,
      isDepositEnabled: requireDeposit,
      depositValue: null,
    };

    if (requireDeposit) {
      payload.depositType = bookingSettings?.depositType === "FIXED"
        ? "FIXED"
        : "PERCENTAGE";
      payload.depositValue = Number.isFinite(normalizedDepositValue)
        ? normalizedDepositValue
        : 0;
    }

    try {
      await updateBookingSettings({
        payload,
        accessToken: session.accessToken,
      });

      toast.success("Deposit settings saved successfully");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? "Failed to save deposit settings";
      toast.error(message);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Deposit Settings</h2>
      <p className="mt-1 text-sm text-[#6571FF]">
        Configure deposit requirements for bookings
      </p>

      {/* Require Deposit row */}
      <div className="mt-6 flex items-center justify-between">
        <span className="font-semibold text-gray-800">Require Deposit</span>
        <Switch checked={requireDeposit} setChecked={setRequireDeposit} />
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isLoading || isSaving || !shopId}
          className="bg-[#6571FF] hover:bg-[#5a66ee]"
        >
          {isSaving ? "Saving..." : "Save Deposits"}
        </Button>
      </div>
    </div>
  );
}

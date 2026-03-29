"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { Switch } from "@/components/Switch";
import { Button } from "@/components/ui/button";
import { useGetVirtualShopConfigure } from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import {
  useGetShopBookingSettings,
  useUpdateShopBookingSettings,
} from "@/hooks/virtual-shop/booking-settings/useShopBookingSettings";

export default function FinancialTab() {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId ?? 0;

  const { data: shopConfig, isLoading: isShopConfigLoading } =
    useGetVirtualShopConfigure(companyId);
  const shopId = Number(shopConfig?.id ?? 0);

  const { data: bookingSettings, isLoading: isBookingSettingsLoading } =
    useGetShopBookingSettings(shopId);
  const { mutateAsync: updateBookingSettings, isPending: isSaving } =
    useUpdateShopBookingSettings(shopId);

  const [shopFee, setShopFee] = useState(false);
  const [tax, setTax] = useState(false);
  const companyTaxPercent = useMemo(() => {
    const value = Number(shopConfig?.company?.tax ?? 0);
    return Number.isFinite(value) ? value : 0;
  }, [shopConfig?.company?.tax]);

  const companyServiceFeePercent = useMemo(() => {
    const value = Number(shopConfig?.company?.serviceFee ?? 0);
    return Number.isFinite(value) ? value : 0;
  }, [shopConfig?.company?.serviceFee]);

  const isLoading = isShopConfigLoading || isBookingSettingsLoading;

  useEffect(() => {
    if (!bookingSettings) return;

    setShopFee(Boolean(bookingSettings.isServiceFeeEnabled));
    setTax(Boolean(bookingSettings.isTaxEnabled));
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

    try {
      await updateBookingSettings({
        payload: {
          shopId,
          isTaxEnabled: tax,
          isServiceFeeEnabled: shopFee,
        },
        accessToken: session.accessToken,
      });

      toast.success("Financial settings saved successfully");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? "Failed to save financial settings";
      toast.error(message);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Financial Add-ons</h2>
      <p className="mt-1 text-sm text-[#6571FF]">
        Tax and shop fee rates are synced from company settings. Use this page
        only to toggle whether they apply to virtual shop bookings.
      </p>

      {/* Shop Fee */}
      <div className="mt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-800">Shop Fee</p>
            <p className="text-sm text-gray-400">
              Applied as percentage of subtotal
            </p>
          </div>
          <Switch checked={shopFee} setChecked={setShopFee} />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Shop Fee Percentage (%)
          </label>
          <input
            type="number"
            value={companyServiceFeePercent}
            readOnly
            disabled
            className="w-32 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#6571FF] focus:ring-1 focus:ring-[#6571FF] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>

      {/* Tax */}
      <div className="mt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-800">Tax</p>
            <p className="text-sm text-gray-400">
              Applied to subtotal + shop fee
            </p>
          </div>
          <Switch checked={tax} setChecked={setTax} />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Tax Percentage (%)
          </label>
          <input
            type="number"
            value={companyTaxPercent}
            readOnly
            disabled
            className="w-32 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#6571FF] focus:ring-1 focus:ring-[#6571FF] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isLoading || isSaving || !shopId}
          className="bg-[#6571FF] hover:bg-[#5a66ee]"
        >
          {isSaving ? "Saving..." : "Save Financial Settings"}
        </Button>
      </div>
    </div>
  );
}

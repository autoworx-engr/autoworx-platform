"use client";

import { Switch } from "@/components/Switch";
import { Button } from "@/components/ui/button";
import {
  useGetShopBookingSettings,
  useUpdateShopBookingSettings,
} from "@/hooks/virtual-shop/booking-settings/useShopBookingSettings";
import { useGetVirtualShopConfigureById } from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type FinancialTabProps = {
  shopId?: number;
};

export default function FinancialTab({ shopId = 0 }: FinancialTabProps) {
  const { data: session } = useSession();
  const { data: shopConfig } = useGetVirtualShopConfigureById(shopId);

  const {
    data: bookingSettings,
    isLoading: isBookingSettingsLoading,
    isFetched: hasFetchedBookingSettings,
  } = useGetShopBookingSettings(shopId);
  const { mutateAsync: updateBookingSettings, isPending: isSaving } =
    useUpdateShopBookingSettings(shopId);

  const [shopFee, setShopFee] = useState(false);
  const [tax, setTax] = useState(false);

  const taxRate = useMemo(() => {
    const value = Number(shopConfig?.company?.tax ?? 0);
    return Number.isFinite(value) ? value : 0;
  }, [shopConfig?.company?.tax]);

  const shopFeeRate = useMemo(() => {
    const value = Number(shopConfig?.company?.serviceFee ?? 0);
    return Number.isFinite(value) ? value : 0;
  }, [shopConfig?.company?.serviceFee]);

  const isLoading = isBookingSettingsLoading;
  const isHydratingBookingSettings = shopId > 0 && !hasFetchedBookingSettings;

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
      <p className="mt-1 text-sm text-primary">
        Enable or disable tax and shop fee for virtual shop bookings.
      </p>

      {isHydratingBookingSettings && (
        <div className="mt-6 flex flex-col gap-4 animate-pulse">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="h-5 w-24 rounded bg-gray-200" />
                <div className="h-4 w-56 rounded bg-gray-200" />
              </div>
              <div className="h-6 w-11 rounded-full bg-gray-200" />
            </div>
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="h-5 w-16 rounded bg-gray-200" />
                <div className="h-4 w-52 rounded bg-gray-200" />
              </div>
              <div className="h-6 w-11 rounded-full bg-gray-200" />
            </div>
          </div>

          <div className="mt-2 flex justify-end">
            <div className="h-10 w-44 rounded-md bg-gray-200" />
          </div>
        </div>
      )}

      {!isHydratingBookingSettings && (
        <>
          {/* Shop Fee */}
          <div className="mt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-800">
                  Shop Fee ({shopFeeRate.toFixed(2)}%)
                </p>
                <p className="text-sm text-gray-400">
                  Applied as percentage of subtotal
                </p>
              </div>
              <Switch checked={shopFee} setChecked={setShopFee} />
            </div>
          </div>

          {/* Tax */}
          <div className="mt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-800">
                  Tax ({taxRate.toFixed(2)}%)
                </p>
                <p className="text-sm text-gray-400">
                  Applied to subtotal + shop fee
                </p>
              </div>
              <Switch checked={tax} setChecked={setTax} />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isLoading || isSaving || !shopId}
              className="bg-primary hover:bg-[#5a66ee]"
            >
              {isSaving ? "Saving..." : "Save Financial Settings"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

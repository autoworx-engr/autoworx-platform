"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { Switch } from "@/components/Switch";
import { Button } from "@/components/ui/button";
import { useGetVirtualShopConfigure } from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import {
  getCompanyTermsAndPolicyTax,
  updateTaxCurrency,
} from "@/actions/settings/emailTemplates";
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
  const [shopFeePercent, setShopFeePercent] = useState("0");
  const [taxPercent, setTaxPercent] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [isFetchingFinancialDefaults, setIsFetchingFinancialDefaults] =
    useState(false);
  const hasInitializedFinancialValues = useRef(false);

  const isLoading =
    isShopConfigLoading ||
    isBookingSettingsLoading ||
    isFetchingFinancialDefaults;

  useEffect(() => {
    if (!bookingSettings) return;

    setShopFee(Boolean(bookingSettings.isServiceFeeEnabled));
    setTax(Boolean(bookingSettings.isTaxEnabled));
  }, [bookingSettings]);

  useEffect(() => {
    if (hasInitializedFinancialValues.current) return;

    const companyTax = shopConfig?.company?.tax;
    const companyServiceFee = shopConfig?.company?.serviceFee;

    if (companyTax !== undefined && companyTax !== null) {
      setTaxPercent(String(companyTax));
    }
    if (companyServiceFee !== undefined && companyServiceFee !== null) {
      setShopFeePercent(String(companyServiceFee));
    }

    if (companyTax !== undefined || companyServiceFee !== undefined) {
      hasInitializedFinancialValues.current = true;
    }
  }, [shopConfig?.company?.tax, shopConfig?.company?.serviceFee]);

  useEffect(() => {
    if (hasInitializedFinancialValues.current) return;

    let mounted = true;

    const fetchCompanyFinancialDefaults = async () => {
      try {
        setIsFetchingFinancialDefaults(true);
        const data = await getCompanyTermsAndPolicyTax();
        if (!mounted) return;

        setTaxPercent(String(data?.tax ?? 0));
        setShopFeePercent(String(data?.serviceFee ?? 0));
        setCurrency(data?.currency || "USD");
        hasInitializedFinancialValues.current = true;
      } catch {
        if (!mounted) return;
        setCurrency("USD");
      } finally {
        if (mounted) {
          setIsFetchingFinancialDefaults(false);
        }
      }
    };

    fetchCompanyFinancialDefaults();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (!shopId) {
      toast.error("Shop is not configured yet");
      return;
    }

    if (!session?.accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }

    if (
      !/^\d*\.?\d*$/.test(taxPercent) ||
      !/^\d*\.?\d*$/.test(shopFeePercent)
    ) {
      toast.error("Tax and shop fee must be valid numbers");
      return;
    }

    const parsedTax = Number(taxPercent || "0");
    const parsedServiceFee = Number(shopFeePercent || "0");

    if (Number.isNaN(parsedTax) || parsedTax < 0) {
      toast.error("Tax percentage must be 0 or greater");
      return;
    }

    if (Number.isNaN(parsedServiceFee) || parsedServiceFee < 0) {
      toast.error("Shop fee percentage must be 0 or greater");
      return;
    }

    try {
      await Promise.all([
        updateBookingSettings({
          payload: {
            shopId,
            isTaxEnabled: tax,
            isServiceFeeEnabled: shopFee,
          },
          accessToken: session.accessToken,
        }),
        updateTaxCurrency({
          currency: currency || "USD",
          tax: taxPercent || "0",
          serviceFee: shopFeePercent || "0",
        }),
      ]);

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
        Configure fees and tax settings
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
            min="0"
            step="0.01"
            value={shopFeePercent}
            disabled={!shopFee}
            onChange={(e) =>
              /^\d*\.?\d*$/.test(e.target.value) &&
              setShopFeePercent(e.target.value)
            }
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
            min="0"
            step="0.01"
            value={taxPercent}
            disabled={!tax}
            onChange={(e) =>
              /^\d*\.?\d*$/.test(e.target.value) &&
              setTaxPercent(e.target.value)
            }
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

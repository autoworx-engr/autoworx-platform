"use client";

import Selector from "@/components/Selector";
import { SlimInput } from "@/components/SlimInput";
import { Switch } from "@/components/Switch";
import { Button } from "@/components/ui/button";
import {
  useGetShopBookingSettings,
  useUpdateShopBookingSettings,
} from "@/hooks/virtual-shop/booking-settings/useShopBookingSettings";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const DEPOSIT_TYPES = ["Percentage (%)", "Fixed Amount ($)"] as const;
type DepositType = (typeof DEPOSIT_TYPES)[number];

const UI_TO_API_DEPOSIT_TYPE: Record<DepositType, "FIXED" | "PERCENTAGE"> = {
  "Percentage (%)": "PERCENTAGE",
  "Fixed Amount ($)": "FIXED",
};

const API_TO_UI_DEPOSIT_TYPE: Record<"FIXED" | "PERCENTAGE", DepositType> = {
  FIXED: "Fixed Amount ($)",
  PERCENTAGE: "Percentage (%)",
};

type DepositsTabProps = {
  shopId?: number;
};

export default function DepositsTab({ shopId = 0 }: DepositsTabProps) {
  const { data: session } = useSession();

  const [requireDeposit, setRequireDeposit] = useState(false);
  const [depositType, setDepositType] = useState<DepositType>("Percentage (%)");
  const [amount, setAmount] = useState("25");
  const {
    data: bookingSettings,
    isLoading: isBookingSettingsLoading,
    isFetched: hasFetchedBookingSettings,
  } = useGetShopBookingSettings(shopId);
  const { mutateAsync: updateBookingSettings, isPending: isSaving } =
    useUpdateShopBookingSettings(shopId);

  const label =
    depositType === "Percentage (%)" ? "Percentage (%)" : "Fixed Amount ($)";
  const depositTypeItems = [...DEPOSIT_TYPES];

  const handleDepositTypeChange = (item: (typeof DEPOSIT_TYPES)[number]) => {
    setDepositType(item);
  };

  const isLoading = isBookingSettingsLoading;
  const isHydratingBookingSettings = shopId > 0 && !hasFetchedBookingSettings;

  const parsedAmount = useMemo(() => {
    if (!amount.trim()) return null;
    const next = Number(amount);
    return Number.isNaN(next) ? null : next;
  }, [amount]);

  useEffect(() => {
    if (!bookingSettings) return;

    setRequireDeposit(Boolean(bookingSettings.isDepositEnabled));

    if (bookingSettings.depositType) {
      setDepositType(
        API_TO_UI_DEPOSIT_TYPE[bookingSettings.depositType] ?? "Percentage (%)",
      );
    }

    if (
      bookingSettings.depositValue !== null &&
      bookingSettings.depositValue !== undefined
    ) {
      setAmount(String(bookingSettings.depositValue));
    } else {
      setAmount("");
    }
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

    if (requireDeposit) {
      if (
        parsedAmount === null ||
        parsedAmount < 0 ||
        !Number.isInteger(parsedAmount)
      ) {
        toast.error("Please enter a valid deposit number");
        return;
      }

      if (depositType === "Percentage (%)" && parsedAmount > 100) {
        toast.error("Percentage cannot exceed 100");
        return;
      }
    }

    try {
      await updateBookingSettings({
        payload: {
          shopId,
          isDepositEnabled: requireDeposit,
          depositType: requireDeposit
            ? UI_TO_API_DEPOSIT_TYPE[depositType]
            : undefined,
          depositValue: requireDeposit ? parsedAmount : null,
        },
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
      <p className="mt-1 text-sm text-primary">
        Configure deposit requirements for bookings
      </p>

      {isHydratingBookingSettings && (
        <div className="mt-6 flex flex-col gap-4 animate-pulse">
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="h-10 w-full md:w-48 rounded bg-gray-100" />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-10 w-full md:max-w-40 rounded bg-gray-100" />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="h-5 w-32 rounded bg-gray-200" />
            <div className="h-6 w-11 rounded-full bg-gray-200" />
          </div>

          <div className="mt-2 flex justify-end">
            <div className="h-10 w-32 rounded-md bg-gray-200" />
          </div>
        </div>
      )}

      {!isHydratingBookingSettings && (
        <>
          {/* Conditional fields */}
          {requireDeposit && (
            <div className="w-full md:max-w-xl mt-6 flex flex-col gap-4">
              {/* Deposit Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Deposit Type
                </label>
                <Selector
                  items={depositTypeItems}
                  selectedItem={depositType}
                  onSelect={handleDepositTypeChange}
                  label={(item) => item ?? "Select type"}
                  displayList={(item) => <span>{item}</span>}
                  newButton={<></>}
                  showSearch={false}
                  className="w-full md:w-48"
                />
              </div>

              {/* Amount / Percentage — integer only */}
              <SlimInput
                name="depositAmount"
                value={amount}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  if (nextValue === "" || /^\d+$/.test(nextValue)) {
                    setAmount(nextValue);
                  }
                }}
                onKeyDown={(e) => {
                  if (["e", "E", "+", "-", "."].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                label={label}
                type="number"
                min="0"
                max={depositType === "Percentage (%)" ? "100" : undefined}
                step="1"
                className="w-full md:max-w-40"
              />
            </div>
          )}

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
              className="bg-primary hover:bg-[#5a66ee]"
            >
              {isSaving ? "Saving..." : "Save Deposits"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

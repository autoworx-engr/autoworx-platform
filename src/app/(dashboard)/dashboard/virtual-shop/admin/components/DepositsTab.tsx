"use client";

import { useState } from "react";
import { Switch } from "@/components/Switch";
import Selector from "@/components/Selector";
import { SlimInput } from "@/components/SlimInput";

const DEPOSIT_TYPES = ["Percentage (%)", "Fixed Amount ($)"] as const;
type DepositType = (typeof DEPOSIT_TYPES)[number];

export default function DepositsTab() {
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [depositType, setDepositType] = useState<DepositType>("Percentage (%)");
  const [amount, setAmount] = useState("25");

  const label = depositType === "Percentage (%)" ? "Percentage (%)" : "Fixed Amount ($)";
  const depositTypeItems = [...DEPOSIT_TYPES];
  const handleDepositTypeChange = (item: (typeof DEPOSIT_TYPES)[number]) => {
    setDepositType(item);
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

          {/* Amount / Percentage */}
          <SlimInput
            name="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            label={label}
            type="number"
            min="0"
            className="w-full md:max-w-40"
          />
        </div>
      )}
    </div>
  );
}

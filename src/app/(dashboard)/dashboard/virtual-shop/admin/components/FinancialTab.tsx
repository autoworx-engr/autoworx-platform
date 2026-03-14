"use client";

import { useState } from "react";
import { Switch } from "@/components/Switch";

export default function FinancialTab() {
  const [shopFee, setShopFee] = useState(false);
  const [shopFeePercent, setShopFeePercent] = useState("3");
  const [tax, setTax] = useState(true);
  const [taxPercent, setTaxPercent] = useState("8.25");

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Financial Add-ons</h2>
      <p className="mt-1 text-sm text-[#6571FF]">Configure fees and tax settings</p>

      {/* Shop Fee */}
      <div className="mt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-800">Shop Fee</p>
            <p className="text-sm text-gray-400">Applied as percentage of subtotal</p>
          </div>
          <Switch checked={shopFee} setChecked={setShopFee} />
        </div>

        {shopFee && (
          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Shop Fee Percentage (%)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={shopFeePercent}
              onChange={(e) => setShopFeePercent(e.target.value)}
              className="w-32 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#6571FF] focus:ring-1 focus:ring-[#6571FF]"
            />
          </div>
        )}
      </div>

      {/* Tax */}
      <div className="mt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-800">Tax</p>
            <p className="text-sm text-gray-400">Applied to subtotal + shop fee</p>
          </div>
          <Switch checked={tax} setChecked={setTax} />
        </div>

        {tax && (
          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Tax Percentage (%)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              className="w-32 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#6571FF] focus:ring-1 focus:ring-[#6571FF]"
            />
          </div>
        )}
      </div>
    </div>
  );
}

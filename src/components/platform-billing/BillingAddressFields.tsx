"use client";

import { MapPin } from "lucide-react";

export type TBillingAddressValue = {
  address: string;
  city: string;
  state: string;
  zip: string;
};

interface BillingAddressFieldsProps {
  value: TBillingAddressValue;
  onChange: (field: keyof TBillingAddressValue, value: string) => void;
}

const inputClassName =
  "w-full px-4 py-3 bg-white dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-800 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all duration-300 text-sm text-slate-600 dark:text-slate-200";

// Authorize.Net requires billing address/city/state/zip on the $0 auth run
// during payment-profile validation (production/LIVEMODE only — sandbox
// doesn't enforce this), so this is collected from the payer directly
// rather than reused from the company's on-file business address.
export function BillingAddressFields({
  value,
  onChange,
}: BillingAddressFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 ml-1">
          Billing Address
        </label>
        <div className="relative group">
          <input
            type="text"
            placeholder="123 Main Street"
            className={`pl-10 pr-4 ${inputClassName}`}
            value={value.address}
            onChange={(e) => onChange("address", e.target.value)}
            required
          />
          <MapPin
            size={16}
            className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 ml-1">City</label>
          <input
            type="text"
            placeholder="New York"
            className={inputClassName}
            value={value.city}
            onChange={(e) => onChange("city", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 ml-1">State</label>
          <input
            type="text"
            placeholder="NY"
            className={inputClassName}
            value={value.state}
            onChange={(e) => onChange("state", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 ml-1">Zip</label>
          <input
            type="text"
            placeholder="10001"
            className={inputClassName}
            value={value.zip}
            onChange={(e) => onChange("zip", e.target.value)}
            required
          />
        </div>
      </div>
    </>
  );
}

"use client";

import PaymentFilterPopover from "@/components/payment-filter/PaymentFilterPopover";
import { cn } from "@/lib/cn";
import {
  PaymentMethod,
  PaymentStatus,
  usePaymentFilterStore,
} from "@/stores/paymentFilter";
import { useState } from "react";
import SliderRange from "./SliderRange";

const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  "All",
  "Cash",
  "Card",
  "Cheque",
  "Deposit",
  "Other",
  "Refund",
];

const STATUS_OPTIONS: PaymentStatus[] = ["All", "Paid", "Unpaid"];

const DEFAULT_AMOUNT: [number, number] = [0, 3000];

const FilterforPayment = () => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("All");
  const [amount, setAmount] = useState<[number, number]>(DEFAULT_AMOUNT);
  const [status, setStatus] = useState<PaymentStatus>("All");
  const [showFilter, setShowFilter] = useState(false);
  const { setFilter } = usePaymentFilterStore();

  const onApply = () => {
    setFilter({ amount, paidStatus: status, paymentMethod });
    setShowFilter(false);
  };

  const onClear = () => {
    setPaymentMethod("All");
    setAmount([1, 30_000]);
    setStatus("All");
    setShowFilter(false);
    setFilter({
      paidStatus: "All",
      amount: [1, 30_000],
      paymentMethod: "All",
    });
  };

  return (
    <PaymentFilterPopover
      open={showFilter}
      onOpenChange={setShowFilter}
      methods={PAYMENT_METHOD_OPTIONS}
      selectedMethod={paymentMethod}
      onMethodChange={(method) => setPaymentMethod(method as PaymentMethod)}
      onApply={onApply}
      onClear={onClear}
      panelClassName="-right-16 md:right-auto [@media(min-width:375px)]:-right-4 [@media(min-width:425px)]:-right-[4.5rem]"
    >
      <div className="mb-6">
        <div className="font-Inter mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Amount
        </div>
        <div className="flex items-center">
          <span className="mr-4 w-fit text-center text-sm font-medium text-slate-600 dark:text-slate-300">
            ${amount[0]}
          </span>
          <div className="flex-1">
            <SliderRange value={amount} onChange={setAmount} />
          </div>
          <span className="ml-4 w-fit text-center text-sm font-medium text-slate-600 dark:text-slate-300">
            ${amount[1]}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-Inter flex space-x-4">
          {STATUS_OPTIONS.map((statusOption) => (
            <label
              key={statusOption}
              className="group flex cursor-pointer items-center space-x-2"
            >
              <input
                type="radio"
                name="status"
                value={statusOption}
                checked={status === statusOption}
                onChange={() => setStatus(statusOption)}
                className="accent-primary h-4 w-4 transition-all"
              />
              <span
                className={cn(
                  "text-sm text-slate-600 transition-colors group-hover:text-slate-900",
                  "dark:text-slate-300 dark:group-hover:text-white",
                )}
              >
                {statusOption}
              </span>
            </label>
          ))}
        </div>
      </div>
    </PaymentFilterPopover>
  );
};

export default FilterforPayment;

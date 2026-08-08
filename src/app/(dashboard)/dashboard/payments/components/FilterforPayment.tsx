import { cn } from "@/lib/cn";
import {
  PaymentMethod,
  PaymentStatus,
  usePaymentFilterStore,
} from "@/stores/paymentFilter";
import { Filter, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SliderRange from "./SliderRange";

const FilterforPayment = () => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("All");
  const [amount, setAmount] = useState<[number, number]>([0, 3000]);
  const [status, setStatus] = useState<PaymentStatus>("All");
  const [showFilter, setShowFilter] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { setFilter } = usePaymentFilterStore();

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSliderChange = (newValue: [number, number]) => {
    setAmount(newValue);
  };

  const handleClickOutside = (event: any) => {
    if (ref.current && !ref.current.contains(event.target)) {
      setShowFilter(false);
    }
  };

  const onApply = () => {
    setFilter({
      amount,
      paidStatus: status as any,
      paymentMethod,
    });
    setShowFilter(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* <button
        className={`flex h-[40px] w-[150px] items-center justify-center rounded-lg  md:w-[100px] [@media(max-width:320px)]:w-fit ${paymentMethod === "All" ? "border border-gray-300" : "bg-primary text-white"}`}
        onClick={() => setShowFilter((prev) => !prev)}
      >
        {paymentMethod === "All" ? "Filter" : paymentMethod}
      </button> */}
      <button
        className={cn(
          "flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition-all duration-300 min-w-[120px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
          "active:shadow-lg",
          paymentMethod !== "All"
            ? "bg-primary text-white shadow-primary/50"
            : "bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 text-slate-500 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:ring-slate-300 dark:hover:ring-slate-600",
        )}
        onClick={() => setShowFilter((prev) => !prev)}
        title="Open Payment Filters"
      >
        {paymentMethod !== "All" ? (
          <Zap size={16} className="mr-1 fill-white" /> // Use Zap icon when active
        ) : (
          <Filter size={16} className="mr-1" />
        )}
        {paymentMethod === "All" ? "Filter" : paymentMethod}
      </button>

      {showFilter && (
        <div className="absolute -right-16 z-40 mt-2 md:right-auto [@media(min-width:375px)]:-right-4 [@media(min-width:425px)]:-right-[4.5rem] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="mt-2 w-72 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 lg:w-[400px] [@media(min-width:375px)]:w-80 [@media(min-width:425px)]:w-96">
            <div className="mb-6">
              <div className="font-Inter mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Payment Method
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "All",
                  "Cash",
                  "Card",
                  "Check",
                  "Deposit",
                  "Other",
                  "Refund",
                ].map((method) => (
                  <button
                    key={method}
                    className={cn(
                      "flex items-center justify-center rounded-lg border px-3 py-1 text-base font-medium transition-all duration-200 hover:scale-105",
                      paymentMethod === method
                        ? "bg-primary text-white border-transparent shadow-md"
                        : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800",
                    )}
                    onClick={() => setPaymentMethod(method as PaymentMethod)}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <div className="font-Inter mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Amount
              </div>
              <div className="flex items-center">
                <span className="mr-4 text-sm font-medium text-slate-600 dark:text-slate-300 w-fit text-center">
                  ${amount[0]}
                </span>
                <div className="flex-1">
                  <SliderRange value={amount} onChange={handleSliderChange} />
                </div>
                <span className="ml-4 text-sm font-medium text-slate-600 dark:text-slate-300 w-fit text-center">
                  ${amount[1]}
                </span>
              </div>
            </div>
            <div className="mb-6">
              <div className="text-Inter flex space-x-4">
                {["All", "Paid", "Unpaid"].map((statusOption) => (
                  <label
                    key={statusOption}
                    className="flex items-center space-x-2 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="status"
                      value={statusOption}
                      checked={status === statusOption}
                      onChange={() => setStatus(statusOption as PaymentStatus)}
                      className="accent-primary h-4 w-4 transition-all"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {statusOption}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex space-x-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                className="rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] px-6 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all active:scale-95"
                onClick={onApply}
              >
                Apply
              </button>
              <button
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 transition-colors"
                onClick={() => {
                  setPaymentMethod("All");
                  setAmount([1, 30_000]);
                  setStatus("All");
                  setShowFilter(false);
                  setFilter({
                    paidStatus: "All",
                    amount: [1, 30_000],
                    paymentMethod: "All",
                  });
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterforPayment;

import { useEffect, useRef, useState } from "react";
import SliderRange from "./SliderRange";
import {
  PaymentMethod,
  PaymentStatus,
  usePaymentFilterStore,
} from "@/stores/paymentFilter";
import { cn } from "@/lib/cn";

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
      <button
        className="flex h-[40px] w-[150px] items-center justify-center rounded-lg border border-[#66738C] p-2 text-gray-400 md:w-[100px] [@media(max-width:320px)]:w-fit"
        onClick={() => setShowFilter((prev) => !prev)}
      >
        Filter
      </button>

      {showFilter && (
        <div className="absolute -right-16 z-40 md:right-auto [@media(min-width:375px)]:-right-4 [@media(min-width:425px)]:-right-[4.5rem]">
          <div className="mt-2 w-72 rounded border border-[#66738C] bg-background p-4 shadow-md lg:w-[400px] [@media(min-width:375px)]:w-80 [@media(min-width:425px)]:w-96">
            <div className="mb-4">
              <div className="font-Inter mb-2">Payment Method</div>
              <div className="flex flex-wrap gap-2">
                {["All", "Cash", "Card", "Cheque", "Deposit", "Other"].map(
                  (method) => (
                    <button
                      key={method}
                      className={cn(
                        "flex items-center justify-center rounded border px-3 py-1 text-base",
                        paymentMethod === method
                          ? "bg-blue-500 text-[white]"
                          : "border-gray-300 text-[#66738C]",
                      )}
                      onClick={() => setPaymentMethod(method as PaymentMethod)}
                    >
                      {method}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="mb-4">
              <div className="font-Inter mb-2">Amount</div>
              <div className="flex items-center space-x-2">
                <span className="mr-2">${amount[0]}</span>
                <SliderRange value={amount} onChange={handleSliderChange} />
                <span className="ml-4">${amount[1]}</span>
              </div>
            </div>
            <div className="mb-4">
              <div className="text-Inter flex space-x-2">
                {["All", "Paid", "Unpaid"].map((statusOption) => (
                  <label
                    key={statusOption}
                    className="flex items-center space-x-1"
                  >
                    <input
                      type="radio"
                      name="status"
                      value={statusOption}
                      checked={status === statusOption}
                      onChange={() => setStatus(statusOption as PaymentStatus)}
                    />
                    <span>{statusOption}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                className="rounded bg-blue-500 px-4 py-2 text-white"
                onClick={onApply}
              >
                Apply
              </button>
              <button
                className="rounded border border-gray-300 px-4 py-2"
                onClick={() => {
                  setPaymentMethod("All");
                  setAmount([1, 30_000]);
                  setStatus("All");
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

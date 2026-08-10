"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type TProps = {
  activeModal: {
    [key: string]: boolean;
  };
  closeModal: (nameOfModal: string) => void;
  modalName: string;
  toggleModal: (nameOfModal: string) => void;
};

export default function PaymentMethodFilter({
  activeModal,
  closeModal,
  modalName,
  toggleModal,
}: TProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const modalRef = useRef<HTMLDivElement>(null);

  const [selectedMethod, setSelectedMethod] = useState<string>("All");

  // Payment methods based on the image
  const paymentMethods = [
    "All",
    "Cash",
    "Card",
    "Check",
    "Deposit",
    "Refund",
    "Other",
  ];

  useEffect(() => {
    // Initialize selected method from URL
    const paymentMethod = searchParams?.get("paymentMethod");
    if (paymentMethod) {
      setSelectedMethod(paymentMethod);
    }
  }, [searchParams]);

  useEffect(() => {
    // Handle click outside to close modal
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        closeModal(modalName);
      }
    }

    if (activeModal[modalName]) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeModal, closeModal, modalName]);

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
  };

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams?.toString());

    if (selectedMethod && selectedMethod !== "All") {
      params.set("page", "1");
      params.set("paymentMethod", selectedMethod);
    } else {
      params.delete("paymentMethod");
    }

    router.push(`${pathname}?${params.toString()}`);
    closeModal(modalName);
  };

  const clearFilter = () => {
    setSelectedMethod("All");
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("paymentMethod");
    router.push(`${pathname}?${params.toString()}`);
    closeModal(modalName);
  };

  return (
    <div className="relative w-full md:w-auto">
      <button
        onClick={() => toggleModal(modalName)}
        className={`flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition-all duration-300 min-w-[120px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary active:shadow-lg ${
          selectedMethod !== "All"
            ? "bg-primary text-white shadow-primary/50"
            : "bg-white ring-1 ring-slate-200 text-slate-500 hover:bg-slate-50"
        }`}
      >
        {selectedMethod === "All" ? "Filter" : selectedMethod}
      </button>

      {activeModal[modalName] && (
        <div className="absolute right-0 z-40 mt-2 origin-top-right md:left-auto">
          <div
            ref={modalRef}
            className="mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/50 lg:w-[400px]"
          >
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                Payment Method
              </h3>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method}
                    onClick={() => handleMethodSelect(method)}
                    className={`flex items-center justify-center rounded-lg border px-3 py-1 text-base font-medium transition-all duration-200 hover:scale-105 ${
                      selectedMethod === method
                        ? "bg-primary text-white border-transparent shadow-md"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex space-x-2 border-t border-slate-100 pt-4">
              <button
                onClick={applyFilter}
                className="rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] px-6 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all active:scale-95"
              >
                Apply
              </button>
              <button
                onClick={clearFilter}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

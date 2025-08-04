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
    "Cheque",
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
        className="flex w-full items-center justify-between gap-2 rounded-sm border border-gray-400 p-1 px-5 text-sm text-gray-400 hover:border-blue-600 md:max-w-80"
      >
        <span>Filter</span>
      </button>

      {activeModal[modalName] && (
        <div
          ref={modalRef}
          className="absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-md bg-background p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none md:left-0"
        >
          <div className="mb-4">
            <h3 className="mb-2 text-base font-medium text-gray-700">
              Payment Method
            </h3>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method}
                  onClick={() => handleMethodSelect(method)}
                  className={`flex items-center justify-center rounded-md border px-3 py-1 text-sm ${
                    selectedMethod === method
                      ? "border-[#6571FF] bg-[#6571FF] text-white"
                      : "border-gray-300 text-gray-700"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={applyFilter}
              className="rounded-md bg-[#6571FF] px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              Apply
            </button>
            <button
              onClick={clearFilter}
              className="rounded-md border border-gray-300 bg-background px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import PaymentFilterPopover from "@/components/payment-filter/PaymentFilterPopover";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type TProps = {
  activeModal: {
    [key: string]: boolean;
  };
  closeModal: (nameOfModal: string) => void;
  modalName: string;
  toggleModal: (nameOfModal: string) => void;
};

const PAYMENT_METHODS = [
  "All",
  "Cash",
  "Card",
  "Check",
  "Deposit",
  "Refund",
  "Other",
];

export default function PaymentMethodFilter({
  activeModal,
  closeModal,
  modalName,
  toggleModal,
}: TProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedMethod, setSelectedMethod] = useState<string>("All");

  useEffect(() => {
    const paymentMethod = searchParams?.get("paymentMethod");
    if (paymentMethod) {
      setSelectedMethod(paymentMethod);
    }
  }, [searchParams]);

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
    <PaymentFilterPopover
      open={!!activeModal[modalName]}
      onOpenChange={() => toggleModal(modalName)}
      methods={PAYMENT_METHODS}
      selectedMethod={selectedMethod}
      onMethodChange={setSelectedMethod}
      onApply={applyFilter}
      onClear={clearFilter}
      panelClassName="md:left-auto"
    />
  );
}

"use client";

import { updateDueDate } from "@/actions/estimate/invoice/updateDueDate";
import { useTransition } from "react";

type TProps = {
  invoiceId: string;
  dueDate?: string | null;
  setOpen: (open: boolean) => void;
  onWorkOrderCreated?: () => void;
};
export default function SaveWorkOrderBtn({
  invoiceId,
  dueDate,
  setOpen,
  onWorkOrderCreated,
}: TProps) {
  const [pending, startTransition] = useTransition();
  const handleUpdateInvoice = async () => {
    try {
      await updateDueDate(invoiceId, dueDate || "");
      if (onWorkOrderCreated) {
        onWorkOrderCreated();
      }
      setOpen(false);
    } catch (err) {
      console.error(err);
      return;
    }
  };
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(handleUpdateInvoice)}
      className="mx-auto h-10 rounded bg-[#6571FF] px-8 py-2 text-white"
    >
      Save Work Order
    </button>
  );
}

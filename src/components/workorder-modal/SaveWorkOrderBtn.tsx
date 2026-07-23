"use client";

import { saveWorkOrder } from "@/service/work-order/api";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
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
  const currentUser = useGetCurrentUser();
  const handleUpdateInvoice = async () => {
    try {
      if (!currentUser?.companyId) return;
      await saveWorkOrder(currentUser.companyId, invoiceId, dueDate || "");
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
      className="mx-auto h-10 rounded bg-primary px-8 py-2 text-white"
    >
      Save Work Order
    </button>
  );
}

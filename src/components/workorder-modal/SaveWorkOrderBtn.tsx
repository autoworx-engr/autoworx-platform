"use client";

import {
  addTechnician,
  deleteTechnician,
  saveWorkOrder,
  updateTechnician,
} from "@/service/work-order/api";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useState, useTransition } from "react";
import { Circles } from "react-loader-spinner";
import { DraftOperation } from "./WorkOrderModalBody";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { X } from "lucide-react";

type TProps = {
  invoiceId: string;
  dueDate?: string | null;
  setOpen: (open: boolean) => void;
  onWorkOrderCreated?: () => void;
  draftOperations: DraftOperation[];
  companyId?: number;
};

export default function SaveWorkOrderBtn({
  invoiceId,
  dueDate,
  setOpen,
  onWorkOrderCreated,
  draftOperations,
  companyId,
}: TProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const queryClient = useQueryClient();
  const handleUpdateInvoice = async () => {
    try {
      if (!companyId) return;
      setError("");
      setLoading(true);

      // Process draft operations
      for (const op of draftOperations) {
        if (op.type === "add") {
          await addTechnician(companyId, invoiceId, op.payload);
        } else if (op.type === "update") {
          await updateTechnician(companyId, invoiceId, op.techId, op.payload);
        } else if (op.type === "delete") {
          await deleteTechnician(companyId, invoiceId, op.techId);
        }
      }

      await saveWorkOrder(companyId, invoiceId, dueDate || "");

      // Invalidate queries to refresh the parent invoice modal data
      queryClient.invalidateQueries({
        queryKey: queryKeys.getInvoiceModalDataKey(invoiceId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.getWorkOrderDataKey(invoiceId),
      });

      // Dispatch custom event to notify InvoiceModalBody
      const event = new CustomEvent("invoice-updated", {
        detail: { invoiceId: invoiceId },
      });
      window.dispatchEvent(event);

      if (onWorkOrderCreated) {
        onWorkOrderCreated();
      }
      setOpen(false);
    } catch (err) {
      console.error(err);
      const formattedError = errorHandler(err);
      setError(
        formattedError?.errorSource?.length
          ? formattedError.errorSource[0].message
          : formattedError.message,
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex w-full flex-col items-center gap-2 mt-4 mx-auto">
      {error && (
        <div className="flex w-full max-w-[400px] items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-red-700 text-sm">
          <p>{error}</p>
          <button type="button" onClick={() => setError("")}>
            <X size={16} strokeWidth={3} />
          </button>
        </div>
      )}
      <button
        disabled={loading}
        onClick={() => handleUpdateInvoice()}
        className="mx-auto h-10 flex items-center justify-center rounded bg-primary px-8 py-2 text-white min-w-[160px]"
      >
        {loading ? (
          <Circles
            height="20"
            width="20"
            color="#ffffff"
            ariaLabel="circles-loading"
            visible={true}
          />
        ) : (
          "Save Work Order"
        )}
      </button>
    </div>
  );
}

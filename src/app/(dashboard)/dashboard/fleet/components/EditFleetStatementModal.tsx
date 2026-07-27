"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import { cn } from "@/lib/cn";
import { Invoice } from "@prisma/client";
import { Checkbox } from "antd";
import { useEffect, useState } from "react";
import FleetSubHeading from "./FleetSubHeading";

import { editFleetStatement } from "@/actions/fleet/statement/editFleetStatement";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { useFleetInvoiceStore } from "@/stores/fleetInvoiceStore";
import { errorToast, successToast } from "@/lib/toast";

interface EditFleetStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  statementId: string;
  currentInvoices: Invoice[];
  onStatementUpdated?: () => void;
}

const EditFleetStatementModal = ({
  isOpen,
  onClose,
  statementId,
  currentInvoices,
  onStatementUpdated,
}: EditFleetStatementModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { allInvoices } = useFleetInvoiceStore();

  // Initialize selected items with current invoices
  useEffect(() => {
    if (isOpen) {
      setSelectedItems(currentInvoices.map((invoice) => invoice.id));
    }
  }, [isOpen, currentInvoices]);

  const invoices = [
    ...currentInvoices,
    ...allInvoices.filter(
      (inv) => !currentInvoices.some((curr) => curr.id === inv.id),
    ),
  ];

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(invoices.map((invoice) => invoice.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleUpdate = async () => {
    if (selectedItems.length === 0) {
      errorToast("Please select at least one invoice");
      return;
    }

    setLoading(true);
    try {
      const result = await editFleetStatement({
        statementId,
        invoiceIds: selectedItems,
      });

      if (result.type === "success") {
        successToast(result.message || "Statement updated successfully");
        onClose();
        if (onStatementUpdated) {
          onStatementUpdated();
        }
      } else {
        errorToast(result.message || "Failed to update statement");
      }
    } catch (error) {
      errorToast("Failed to update statement");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // ✅ Fixed: use `invoices.length` instead of `allInvoices.length`
  const isAllSelected =
    selectedItems.length === invoices.length && invoices.length > 0;
  const isIndeterminate =
    selectedItems.length > 0 && selectedItems.length < invoices.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="flex max-h-[80vh] w-[95vw] max-w-4xl flex-col overflow-hidden sm:w-full [&>button]:hidden"
      >
        <DialogHeader>
          <DialogTitle>
            <FleetSubHeading text="Edit Fleet Statement" />
          </DialogTitle>
        </DialogHeader>

        {/* Table Container with Scroll */}
        <div className="thin-scrollbar flex-1 overflow-y-auto scroll-smooth">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="h-10">
                <th className="px-3 py-3 text-left">
                  <Checkbox
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    ref={(ref) => {
                      if (ref?.input) {
                        ref.input.indeterminate = isIndeterminate;
                      }
                    }}
                  />
                </th>
                <th className="border-b px-3 py-2 text-left">Invoice#</th>
                <th className="border-b px-3 py-2 text-left">Year</th>
                <th className="border-b px-3 py-2 text-left">Make</th>
                <th className="border-b px-3 py-2 text-left">Model</th>
                <th className="border-b px-3 py-2 text-left">VIN</th>
                <th className="border-b px-3 py-2 text-left">Price</th>
                <th className="border-b px-3 py-2 text-left">Due</th>
                <th className="border-b px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice: any, index) => (
                <tr
                  key={invoice.id}
                  className={cn(
                    "cursor-pointer rounded-md border py-3",
                    index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]",
                  )}
                >
                  <td className="px-3 py-3">
                    <Checkbox
                      checked={selectedItems.includes(invoice.id)}
                      onChange={(e) =>
                        handleSelectItem(invoice.id, e.target.checked)
                      }
                    />
                  </td>
                  <td className="border-b px-4 py-2 text-left text-primary">
                    <InvoiceModal
                      invoiceId={invoice?.id}
                      buttonChild={<button>{invoice?.id}</button>}
                      buttonChildClassName="block w-full text-blue-600"
                    />
                  </td>
                  <td className="border-b px-3 py-2 text-left">
                    {invoice.vehicle?.year || "N/A"}
                  </td>
                  <td className="border-b px-3 py-2 text-left">
                    {invoice.vehicle?.make || "N/A"}
                  </td>
                  <td className="border-b px-3 py-2 text-left">
                    {invoice.vehicle?.model || "N/A"}
                  </td>
                  <td className="border-b px-3 py-2 text-left">
                    {invoice.vehicle?.vin || "N/A"}
                  </td>
                  <td className="border-b px-3 py-2 text-left">
                    {invoice?.grandTotal || "0"}
                  </td>
                  <td className="border-b px-3 py-2 text-left">
                    {invoice?.due || "0"}
                  </td>
                  <td className="border-b px-4 py-2 text-left">
                    {invoice.due > 0 ? "Unpaid" : "Paid"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with buttons */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            {selectedItems.length} of {invoices.length} items selected
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-xl border px-5 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/40 active:translate-y-0 active:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleUpdate}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditFleetStatementModal;

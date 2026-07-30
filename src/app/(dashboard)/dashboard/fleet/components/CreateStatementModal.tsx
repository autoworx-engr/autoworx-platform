"use client";

import { createFleetStatement } from "@/actions/fleet/statement";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { useFleetInvoiceStore } from "@/stores/fleetInvoiceStore";
import { Invoice } from "@prisma/client";
import { Checkbox } from "antd";
import { useEffect, useState } from "react";
import FleetSubHeading from "./FleetSubHeading";
import { errorToast, successToast } from "@/lib/toast";

const CreateStatementModal = ({
  unPaidInvoices,
  fleetId,
  onStatementCreated,
}: {
  unPaidInvoices: Invoice[];
  fleetId?: number;
  onStatementCreated?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAllInvoices } = useFleetInvoiceStore();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Reset selection when modal opens with fresh unpaid invoices
  useEffect(() => {
    if (open) {
      setSelectedItems(unPaidInvoices.map((invoice) => invoice.id));
    }
  }, [open, unPaidInvoices]);

  useEffect(() => {
    setAllInvoices(unPaidInvoices);
  }, [unPaidInvoices]);

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(unPaidInvoices.map((invoice) => invoice.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleCreate = async () => {
    if (selectedItems.length === 0) {
      errorToast("Please select at least one invoice");
      return;
    }

    if (!fleetId) {
      errorToast("Fleet ID is required to create a statement");
      return;
    }

    setLoading(true);
    try {
      const result = await createFleetStatement({
        fleetId,
        invoiceIds: selectedItems,
      });

      if (result.type === "success") {
        successToast(result.message || "Statement created successfully");

        // Close modal first
        setOpen(false);

        // Reset selection
        setSelectedItems([]);

        // Trigger refresh to update the statement list
        if (onStatementCreated) {
          onStatementCreated();
        }
      } else {
        errorToast(result.message || "Failed to create statement");
      }
    } catch (error) {
      console.error("Error creating statement:", error);
      errorToast("Failed to create statement");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    // Reset selection when canceling
    setSelectedItems([]);
  };

  const isAllSelected =
    selectedItems.length === unPaidInvoices.length && unPaidInvoices.length > 0;
  const isIndeterminate =
    selectedItems.length > 0 && selectedItems.length < unPaidInvoices.length;

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-[#8088FF] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/40 transition-all duration-300 hover:from-[#505aff] hover:to-primary hover:shadow-xl">
            Create Statement
          </button>
        </DialogTrigger>
        <DialogContent className="flex max-h-[80vh] w-[95vw] max-w-4xl sm:w-full flex-col overflow-hidden [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>
              <FleetSubHeading text="Unpaid Invoice List" />
            </DialogTitle>
          </DialogHeader>

          {/* Table Container with Scroll */}
          <div className="thin-scrollbar flex-1 overflow-y-auto scroll-smooth">
            {unPaidInvoices.length > 0 ? (
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
                    <th className="border-b px-3 py-2 text-left">Status</th>
                    <th className="border-b px-3 py-2 text-left">Column</th>
                  </tr>
                </thead>
                <tbody>
                  {unPaidInvoices.map((invoice: any, index) => (
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
                        {invoice.vehicle?.model ||
                          invoice.vehicle?.other ||
                          "N/A"}
                      </td>
                      <td className="border-b px-3 py-2 text-left">
                        {invoice.vehicle?.vin || "N/A"}
                      </td>
                      <td className="border-b px-3 py-2 text-left">
                        {invoice?.grandTotal || "0"}
                      </td>
                      <td className="border-b px-4 py-2 text-left">
                        {invoice.due > 0 ? "Unpaid" : "Paid"}
                      </td>
                      <td className="border-b px-4 py-2 text-left">
                        {invoice.column?.title || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-500">No unpaid invoices available</p>
              </div>
            )}
          </div>

          {/* Footer with buttons */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-gray-600">
              {selectedItems.length} of {unPaidInvoices.length} items selected
            </div>
            <div className="flex gap-2">
              <button
                className="
                rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-primary to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:translate-y-0 disabled:hover:scale-100
                transition-all duration-200
              "
                onClick={handleCreate}
                disabled={selectedItems.length === 0 || loading || !fleetId}
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateStatementModal;

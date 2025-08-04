"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import { Checkbox, message } from "antd";
import { useState } from "react";
import FleetSubHeading from "./FleetSubHeading";
import { cn } from "@/lib/cn";
import { Invoice } from "@prisma/client";
import { createFleetStatement } from "@/actions/fleet/statement";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";

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
  const [selectedItems, setSelectedItems] = useState<string[]>(
    unPaidInvoices.map((invoice) => invoice.id)
  );

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
      message.error("Please select at least one invoice");
      return;
    }

    if (!fleetId) {
      message.error("Fleet ID is required to create a statement");
      return;
    }

    setLoading(true);
    try {
      const result = await createFleetStatement({
        fleetId,
        invoiceIds: selectedItems,
      });

      if (result.type === "success") {
        message.success(result.message);
        setOpen(false);
        if (onStatementCreated) {
          onStatementCreated();
        }
      } else {
        message.error(result.message || "Failed to create statement");
      }
    } catch (error) {
      // console.error("Error creating statement:", error);
      message.error("Failed to create statement");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const isAllSelected = selectedItems.length === unPaidInvoices.length;
  const isIndeterminate =
    setSelectedItems.length > 0 && selectedItems.length < unPaidInvoices.length;
  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="w-fit self-end rounded-md bg-[#6571FF] p-2 px-5 text-white">
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
                  <th className="border-b px-3 py-2 text-left">Payment</th>
                  <th className="border-b px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {unPaidInvoices.map((invoice: any, index) => (
                  <tr
                    key={invoice.id}
                    className={cn(
                      "cursor-pointer rounded-md border py-3",
                      index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]"
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
                    <td className="border-b px-4 py-2 text-left text-[#6571FF]">
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
                    {invoice.vehicle?.other && (
                      <td className="border-b px-3 py-2 text-left">
                        {invoice.vehicle?.model || "N/A"}
                      </td>
                    )}
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
          </div>

          {/* Footer with buttons */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-gray-600">
              {selectedItems.length} of {unPaidInvoices.length} items selected
            </div>
            <div className="flex gap-2">
              <button
                className="w-fit self-end rounded-md border border-[#66738C] p-2 px-5 text-[#66738C]"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="w-fit self-end rounded-md bg-[#6571FF] p-2 px-5 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
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

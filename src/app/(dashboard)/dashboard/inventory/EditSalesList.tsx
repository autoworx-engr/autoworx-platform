"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import Selector from "@/components/Selector";
import { SlimInput } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import {
  Client,
  InventoryProductHistory,
  InventoryProductType,
  Vendor,
} from "@prisma/client";
import { useEffect, useState, useTransition, useRef } from "react";
import { useProduct as productUse } from "../../../../actions/inventory/useProduct";
import { useFormErrorStore } from "@/stores/form-error";
import { FaEdit } from "react-icons/fa";

interface EditSalesListProps {
  productId: number;
  productType: InventoryProductType;
  invoiceIds: string[];
  cost: number;
  history?: InventoryProductHistory & {
    vendor: Vendor | null;
    client: Client | null;
  };
}

export default function EditSalesList({
  productId,
  invoiceIds,
  cost,
  productType,
  history,
}: EditSalesListProps) {
  const [open, setOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    history?.invoiceId || null,
  );
  const [date, setDate] = useState(
    history?.date
      ? new Date(history.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [quantity, setQuantity] = useState(history?.quantity?.toString() || "");
  // Use a ref to store the original quantity to ensure it doesn't change unexpectedly
  const originalQuantityRef = useRef<number>(Number(history?.quantity ?? 0));
  const [notes, setNotes] = useState(history?.notes || "");
  const [formChanged, setFormChanged] = useState(false);
  const { showError, clearError } = useFormErrorStore();
  const [pending, startTransition] = useTransition();

  // Check if form has changed
  useEffect(() => {
    const originalDate = history?.date
      ? new Date(history.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    const originalQuantity = history?.quantity?.toString() || "";
    const originalNotes = history?.notes || "";
    const originalInvoiceId = history?.invoiceId || null;

    const hasChanged =
      date !== originalDate ||
      quantity !== originalQuantity ||
      notes !== originalNotes ||
      selectedInvoiceId !== originalInvoiceId;

    setFormChanged(hasChanged);
  }, [date, quantity, notes, selectedInvoiceId, history]);

  // Reset original quantity when dialog opens
  useEffect(() => {
    if (open) {
      // Update the ref when the dialog opens
      originalQuantityRef.current = Number(history?.quantity ?? 0);
    }
  }, [open, history]);

  async function handleSubmit(formData: FormData) {
    // Parse the new quantity from input
    const newQuantityValue = Number(quantity);

    // Get the original quantity from the ref
    const originalQuantity = originalQuantityRef.current;

    // Calculate the difference and determine if it's an increase or decrease
    let quantityDifference: number;
    let isPositive: boolean;

    if (newQuantityValue > originalQuantity) {
      // Quantity increased - we need to add inventory
      quantityDifference = newQuantityValue - originalQuantity;
      isPositive = true;
    } else {
      // Quantity decreased or stayed same - we need to remove inventory
      quantityDifference = originalQuantity - newQuantityValue;
      isPositive = false;
    }

    // Don't allow zero difference (no change)
    if (quantityDifference === 0) {
      quantityDifference = newQuantityValue;
    }

    const res = await productUse({
      productId,
      date: new Date(date),
      quantity: quantityDifference.toString(),
      notes,
      invoiceId: selectedInvoiceId,
    });

    if (res.type === "success") {
      setOpen(false);
      setSelectedInvoiceId(null);
      clearError();
    } else if (res.type === "globalError") {
      showError({
        field: res.field || "all",
        message:
          res.errorSource && res.errorSource.length > 0
            ? res.errorSource[0].message
            : res.message,
      });
    }
  }

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setDate(
        history?.date
          ? new Date(history.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      );
      setQuantity(history?.quantity?.toString() || "");
      setNotes(history?.notes || "");
      setSelectedInvoiceId(history?.invoiceId || null);
    } else {
      clearError();
    }
  }, [open, history, clearError]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center justify-end text-[#6571FF] md:justify-center">
          <FaEdit />
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-full w-[96%] max-w-xl md:w-[30rem]" form>
        <DialogHeader>
          <DialogTitle>Edit Sales</DialogTitle>
        </DialogHeader>

        <FormError />

        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-2">
          <SlimInput
            name="date"
            type="date"
            className="col-span-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <br className="block md:hidden" />
          <SlimInput
            name="quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="col-span-1"
          />
          <br className="block md:hidden" />

          <SlimInput
            name="cost"
            className="col-span-1"
            value={cost.toString()}
            disabled
          />

          {productType === "Product" && (
            <div className="col-span-2">
              <Selector
                label={(invoice: string | null) => invoice || "Select Invoice"}
                items={invoiceIds}
                selectedItem={selectedInvoiceId}
                setSelectedItem={setSelectedInvoiceId}
                displayList={(invoiceId) => <p>{invoiceId}</p>}
                newButton={<></>}
              />
            </div>
          )}

          <div className="col-span-2">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              required={false}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-28 w-full rounded-sm border border-primary-foreground border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose className="rounded-lg border-2 border-slate-400 p-2">
            Cancel
          </DialogClose>
          <Submit
            className="mb-2 flex items-center justify-center rounded-lg border bg-[#6571FF] px-5 py-2 text-white disabled:bg-slate-400 md:mb-0"
            formAction={(formData: FormData) => {
              startTransition(() => handleSubmit(formData));
              return Promise.resolve();
            }}
            disabled={pending || !formChanged}
          >
            Submit
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

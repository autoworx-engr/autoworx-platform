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
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone"; // ← adjust path if needed
import { useFormErrorStore } from "@/stores/form-error";
import {
  Client,
  InventoryProductHistory,
  InventoryProductType,
  Vendor,
} from "@prisma/client";
import { SquarePen } from "lucide-react";
import moment from "moment-timezone";
import { useEffect, useRef, useState, useTransition } from "react";
import { useProduct as productUse } from "../../../../actions/inventory/useProduct";

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

  const companyTz = useCompanyTimezone();

  // Helper: format a date for <input type="date"> in company TZ (never null)
  const formatForInput = (d?: Date | string | null): string =>
    d
      ? moment(d ?? undefined)
          .tz(companyTz)
          .format("YYYY-MM-DD")
      : moment().tz(companyTz).format("YYYY-MM-DD");

  const [date, setDate] = useState<string>(formatForInput(history?.date));
  const [quantity, setQuantity] = useState<string>(
    history?.quantity?.toString() || "",
  );
  // Keep original quantity stable for diff calcs
  const originalQuantityRef = useRef<number>(Number(history?.quantity ?? 0));
  const [notes, setNotes] = useState<string>(history?.notes || "");
  const [formChanged, setFormChanged] = useState(false);
  const { showError, clearError } = useFormErrorStore();
  const [pending, startTransition] = useTransition();

  // Detect form changes (compare against originals in company TZ)
  useEffect(() => {
    const originalDate = formatForInput(history?.date);
    const originalQuantity = history?.quantity?.toString() || "";
    const originalNotes = history?.notes || "";
    const originalInvoiceId = history?.invoiceId || null;

    const hasChanged =
      date !== originalDate ||
      quantity !== originalQuantity ||
      notes !== originalNotes ||
      selectedInvoiceId !== originalInvoiceId;

    setFormChanged(hasChanged);
  }, [date, quantity, notes, selectedInvoiceId, history, companyTz]);

  // Reset original quantity when dialog opens
  useEffect(() => {
    if (open) {
      originalQuantityRef.current = Number(history?.quantity ?? 0);
    }
  }, [open, history]);

  async function handleSubmit(_formData: FormData) {
    // Validate quantity input
    const newQuantityValue = Number(quantity);
    if (!Number.isFinite(newQuantityValue) || newQuantityValue <= 0) {
      showError({ message: "Quantity must be a positive number." });
      return;
    }

    // Compute difference vs original
    const originalQuantity = originalQuantityRef.current;
    let quantityDifference: number;

    if (newQuantityValue > originalQuantity) {
      // increased → add
      quantityDifference = newQuantityValue - originalQuantity;
    } else if (newQuantityValue < originalQuantity) {
      // decreased → remove
      quantityDifference = originalQuantity - newQuantityValue;
    } else {
      // unchanged → fallback to submitting current as diff (keeps old behavior)
      quantityDifference = newQuantityValue;
    }

    // Parse "YYYY-MM-DD" in company TZ to a real Date
    const zonedDate = moment.tz(date, "YYYY-MM-DD", companyTz).toDate();

    const res = await productUse({
      productId,
      date: zonedDate, // ✅ aligned with company timezone
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

  // Reset form when dialog opens/closes (keep dates TZ-safe)
  useEffect(() => {
    if (open) {
      setDate(formatForInput(history?.date));
      setQuantity(history?.quantity?.toString() || "");
      setNotes(history?.notes || "");
      setSelectedInvoiceId(history?.invoiceId || null);
    } else {
      clearError();
    }
  }, [open, history, clearError, companyTz]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center justify-end text-primary md:justify-center">
          <SquarePen size={20} />
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
            className="mb-2 flex items-center justify-center rounded-lg border bg-primary px-5 py-2 text-white disabled:bg-slate-400 md:mb-0"
            formAction={(_fd: FormData) => {
              startTransition(() => handleSubmit(_fd));
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

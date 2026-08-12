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
import NewVendor from "@/components/Lists/NewVendor";
import Selector from "@/components/Selector";
import { SlimInput } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { cn } from "@/lib/cn";
import { successToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import {
  Client,
  InventoryProduct,
  InventoryProductHistory,
  User,
  Vendor,
} from "@prisma/client";
import { PencilLineIcon } from "lucide-react";
import moment from "moment-timezone";
import { useEffect, useRef, useState } from "react";
import { UpdatePurchase } from "../../../../actions/inventory/updatePurchase";

type TProps = {
  productId: number;
  user?: User;
  product?: (InventoryProduct & { User: User | null }) | null | undefined;
  history?: InventoryProductHistory & {
    vendor: Vendor | null;
    client: Client | null;
  };
  invoiceIds?: string[];
};

export default function EditSalePurchaseList({
  productId,
  product,
  history,
}: TProps) {
  const companyTz = useCompanyTimezone(); // ✅ get timezone
  const formatDateForInput = (date: Date | string) =>
    moment(date).tz(companyTz).format("YYYY-MM-DD");

  const { vendors } = useListsStore();
  const [open, setOpen] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(history?.vendor || null);
  const [vendorOpen, setVendorOpen] = useState(false);

  const originalQuantityRef = useRef<number>(Number(history?.quantity ?? 0));
  const { showError, clearError } = useFormErrorStore();

  const fromSales = history?.type === "Sale";
  // Initial values from history or defaults (price as total price)
  const initialFormState = {
    date: history?.date
      ? formatDateForInput(history.date)
      : moment().tz(companyTz).format("YYYY-MM-DD"),
    quantity: history?.quantity?.toString() || "",
    price:
      history?.price && history?.quantity
        ? (typeof history.price === "object" && history.price.toNumber
            ? history.price.toNumber() * Number(history.quantity)
            : Number(history.price) * Number(history.quantity)
          ).toFixed(2)
        : "0.00",
    unit: product?.unit || "",
    lot: product?.lot || "",
    notes: history?.notes || "",
    vendorId: history?.vendor?.id || null,
  };

  const [formState, setFormState] = useState(initialFormState);
  useEffect(() => {
    if (open) {
      originalQuantityRef.current = Number(history?.quantity ?? 0);
      setFormState({
        date: history?.date
          ? formatDateForInput(history.date)
          : moment().tz(companyTz).format("YYYY-MM-DD"),
        quantity: history?.quantity?.toString() || "",
        price:
          history?.price && history?.quantity
            ? (typeof history.price === "object" && history.price.toNumber
                ? history.price.toNumber() * Number(history.quantity)
                : Number(history.price) * Number(history.quantity)
              ).toFixed(2)
            : "0.00",
        unit: product?.unit || "",
        lot: product?.lot || "",
        notes: history?.notes || "",
        vendorId: history?.vendor?.id || null,
      });
      setVendor(history?.vendor || null);
    }
  }, [open, history, product]);

  useEffect(() => {
    setFormState((prev) => ({ ...prev, vendorId: vendor?.id || null }));
  }, [vendor]);

  const hasChanges = () => {
    return (
      formState.date !== initialFormState.date ||
      formState.quantity !== initialFormState.quantity ||
      formState.price !== initialFormState.price ||
      formState.unit !== initialFormState.unit ||
      formState.lot !== initialFormState.lot ||
      formState.notes !== initialFormState.notes ||
      formState.vendorId !== initialFormState.vendorId
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmit(formData: FormData) {
    const date = formData.get("date") as string;
    // Parse back into Date in companyTz
    const zonedDate = moment.tz(date, "YYYY-MM-DD", companyTz).toDate();
    const quantity = formData.get("quantity") as string;
    const price = formData.get("price") as string; // Total price
    const unit = formData.get("unit") as string;
    const lot = formData.get("lot") as string;
    const notes = formData.get("notes") as string;

    const newQuantityValue = Number(quantity) || 0;
    if (newQuantityValue <= 0) {
      showError({ message: "Quantity must be a positive number." });
      return;
    }

    if (
      history?.type === "Sale" &&
      product?.quantity &&
      Number(product?.quantity) < newQuantityValue
    ) {
      showError({
        message: "The sale quantity exceeds the available inventory.",
      });
      return;
    }
    const originalQuantity = originalQuantityRef.current;

    let quantityDifference: number;
    let isIncreasing: boolean;
    if (newQuantityValue > originalQuantity) {
      quantityDifference = newQuantityValue - originalQuantity;
      isIncreasing = true;
    } else if (newQuantityValue < originalQuantity) {
      quantityDifference = originalQuantity - newQuantityValue;
      isIncreasing = false;
    } else {
      quantityDifference = 0;
      isIncreasing = false;
    }

    // Calculate per-unit price from total price
    // Use high precision (10dp) to avoid rounding errors when total is later
    // recalculated as price * quantity (e.g. 5000/150 * 150 ≠ 5000 at 2dp)
    let perUnitPrice = parseFloat(price) / newQuantityValue;
    if (!perUnitPrice || !isFinite(perUnitPrice)) perUnitPrice = 0;
    const roundedPerUnitPrice = parseFloat(perUnitPrice.toFixed(10));
    const res = await UpdatePurchase({
      historyId: history?.id ?? 0,
      productId,
      date: zonedDate, // ✅ stored correctly in server timezone
      originalQuantity: originalQuantityRef.current.toString(),
      quantityDifference: quantityDifference.toString(),
      notes,
      vendorId: vendor?.id,
      price: roundedPerUnitPrice || 0,
      unit,
      lot,
      isIncreasing,
      type: history?.type || "Purchase",
    });

    if (res.type === "success") {
      successToast(`${fromSales ? "Sales" : "Purchase"} updated successfully`);
    }

    if (res.type === "globalError") {
      showError({
        field: res.field || "all",
        message:
          res.errorSource && res.errorSource.length > 0
            ? res.errorSource[0].message
            : res.message,
      });
      return;
    }
    setOpen(false);
    clearError();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center justify-end text-primary md:justify-center">
          <PencilLineIcon className="w-5 h-5" />
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-[80%] w-[96%] max-w-xl grid-rows-[auto,1fr,auto] thin-scrollbar"
        onOpenAutoFocus={(e) => e.preventDefault()}
        form
      >
        <DialogHeader>
          <DialogTitle className="text-slate-600">
            Edit {fromSales ? "Sales" : "Purchase"}
          </DialogTitle>
        </DialogHeader>

        <FormError />

        <div className="gap-5 overflow-y-auto pl-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SlimInput
              name="date"
              type="date"
              label="Date"
              onFocus={(e) => {
                // Prevent the default focus behavior to avoid opening the calendar popup
                e.preventDefault();
              }}
              required={true}
              value={formState.date}
              onChange={handleInputChange}
            />

            <div className="space-y-1">
              <label className="font-medium text-slate-600">
                Vendor <span className="text-red-500">*</span>{" "}
              </label>
              <Selector
                label={(selectedVendor: Vendor | null) =>
                  selectedVendor
                    ? selectedVendor.companyName ||
                      selectedVendor.name ||
                      `Vendor ${selectedVendor.id}`
                    : "Select Vendor"
                }
                newButton={
                  <NewVendor
                    afterSubmit={(ven) => {
                      setVendor(ven);
                      setVendorOpen(false);
                    }}
                    button={
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                      >
                        + New Vendor
                      </button>
                    }
                  />
                }
                displayList={(vendor: Vendor) => (
                  <p>{vendor.companyName || vendor.name}</p>
                )}
                items={vendors}
                onSearch={(search: string) =>
                  vendors.filter(
                    (vendor) =>
                      vendor.companyName
                        ?.toLowerCase()
                        ?.includes(search.toLowerCase()) ||
                      vendor.name?.toLowerCase().includes(search.toLowerCase()),
                  )
                }
                openState={[vendorOpen, setVendorOpen]}
                selectedItem={vendor}
                setSelectedItem={setVendor}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <SlimInput
              name="quantity"
              type="number"
              label="Quantity"
              value={formState.quantity}
              onChange={handleInputChange}
              required={true}
            />

            <SlimInput
              name="price"
              type="number"
              label="Total Price"
              value={formState.price}
              onChange={handleInputChange}
              step="0.01"
              required={true}
            />

            <SlimInput
              name="unit"
              label="Unit"
              value={formState.unit}
              onChange={handleInputChange}
              required={true}
            />
            <SlimInput
              name="lot"
              label="Lot#"
              value={formState.lot}
              onChange={handleInputChange}
              required={false}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="notes" className="font-medium text-slate-600">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formState.notes}
              onChange={handleInputChange}
              className={cn(
                "h-24 w-full rounded-md border border-slate-300 outline-none bg-background px-3 py-2 leading-6 transition-all duration-300 thin-scrollbar",
                "bg-white/80 backdrop-blur-sm dark:bg-slate-900/50",
                "text-slate-600 dark:text-slate-300 placeholder:text-slate-400",
                "focus:border-primary/60 focus:ring-2 focus:ring-primary/40",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            className="
            rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 mt-2 md:mt-0 
          hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
            transition-colors border
          "
          >
            Cancel
          </DialogClose>
          <Submit
            className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-primary to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200
                disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed disabled:shadow-none
              "
            formAction={handleSubmit}
            disabled={!hasChanges()}
          >
            Submit
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

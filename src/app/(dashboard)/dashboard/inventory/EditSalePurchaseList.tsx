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
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import {
  Client,
  InventoryProduct,
  InventoryProductHistory,
  User,
  Vendor,
} from "@prisma/client";
import { useState, useEffect, useRef } from "react";
import { UpdatePurchase } from "../../../../actions/inventory/updatePurchase";
import moment from "moment-timezone";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { SquarePen } from "lucide-react";

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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
    let perUnitPrice = parseFloat(price) / newQuantityValue;
    if (!perUnitPrice || !isFinite(perUnitPrice)) perUnitPrice = 0;
    const roundedPerUnitPrice = parseFloat(perUnitPrice.toFixed(2));
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
        <button className="flex w-full items-center justify-end text-[#6571FF] md:justify-center">
          <SquarePen className="w-5 h-5" />
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-full w-[96%] max-w-xl overflow-y-auto md:w-[30rem]"
        form
      >
        <DialogHeader>
          <DialogTitle>Edit {fromSales ? "Sales" : "Purchase"}</DialogTitle>
        </DialogHeader>

        <FormError />

        <div className="flex flex-col gap-3 p-2">
          <SlimInput
            name="date"
            type="date"
            className="col-span-1"
            value={formState.date}
            onChange={handleInputChange}
          />

          <div>
            <label>Vendor</label>
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
                    <button type="button" className="text-xs text-[#6571FF]">
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
                    vendor.name?.toLowerCase().includes(search.toLowerCase())
                )
              }
              openState={[vendorOpen, setVendorOpen]}
              selectedItem={vendor}
              setSelectedItem={setVendor}
            />
          </div>

          <div className="flex flex-wrap gap-3 md:flex-nowrap">
            <SlimInput
              name="quantity"
              type="number"
              value={formState.quantity}
              onChange={handleInputChange}
              required={false}
            />

            <div>
              <label htmlFor="price" className="px-2 font-medium">
                Total Price
              </label>
              <div className="flex gap-1 rounded-sm border border-primary-foreground bg-background px-2 py-0.5 leading-6">
                <span className="text-lg">$</span>
                <input
                  type="number"
                  name="price"
                  value={formState.price} // Display total price
                  onChange={handleInputChange}
                  className="w-full rounded-sm border border-slate-400 px-2 py-0.5 outline-none"
                  id="price"
                  step="0.01"
                />
              </div>
            </div>

            <SlimInput
              name="unit"
              value={formState.unit}
              onChange={handleInputChange}
              required={false}
            />
            <SlimInput
              name="lot"
              value={formState.lot}
              onChange={handleInputChange}
              required={false}
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formState.notes}
              onChange={handleInputChange}
              className="h-28 w-full rounded-sm border border-primary-foreground border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose className="rounded-lg border-2 border-slate-400 p-2">
            Cancel
          </DialogClose>
          <Submit
            className="mb-2 flex items-center justify-center rounded-lg border bg-[#6571FF] px-5 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400 md:mb-0"
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

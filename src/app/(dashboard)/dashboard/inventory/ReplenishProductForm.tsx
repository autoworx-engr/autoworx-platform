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
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { Vendor } from "@prisma/client";
import moment from "moment-timezone";
import { useState } from "react";
import { replenish } from "../../../../actions/inventory/replenish";

export default function ReplenishProductForm({
  productId,
  lastUnit,
}: {
  productId: number;
  lastUnit?: string | null | undefined;
}) {
  const { vendors } = useListsStore();
  const [open, setOpen] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendorOpen, setVendorOpen] = useState(false);

  const companyTz = useCompanyTimezone();

  // Helper for YYYY-MM-DD in company's timezone
  const todayInCompanyTz = moment().tz(companyTz).format("YYYY-MM-DD");
  const { showError, clearError } = useFormErrorStore();

  async function handleSubmit(formData: FormData) {
    const date = formData.get("date") as string;
    // Convert "YYYY-MM-DD" in company TZ to Date
    const zonedDate = moment.tz(date, "YYYY-MM-DD", companyTz).toDate();
    const quantity = formData.get("quantity") as string;
    const price = formData.get("price") as string;
    const unit = formData.get("unit") as string;
    const lot = formData.get("lot") as string;
    const notes = formData.get("notes") as string;

    const perUnitPrice = parseFloat(price) / Number(quantity);
    const roundedPerUnitPrice = parseFloat(perUnitPrice.toFixed(2));

    const res = await replenish({
      productId,
      date: zonedDate, // ✅ aligned with company timezone
      quantity: quantity || "0",
      notes,
      vendorId: vendor?.id,
      price: roundedPerUnitPrice || 0,
      unit: unit,
      lot,
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
        <button
          className="
          w-28 rounded-lg px-4 py-2 text-sm font-semibold text-white
          bg-gradient-to-r from-[#69DBD0] to-[#5acbc0]
          shadow-[0_4px_14px_0_rgba(105,219,208,0.39)]
          hover:shadow-[0_6px_20px_rgba(105,219,208,0.23)]
          hover:-translate-y-0.5
          active:translate-y-0 active:scale-100
          transition-all duration-300 ease-in-out
        "
        >
          Replenish
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-[80%] w-[96%] max-w-xl grid-rows-[auto,1fr,auto] thin-scrollbar"
        onOpenAutoFocus={(e) => e.preventDefault()}
        form
      >
        <DialogHeader>
          <DialogTitle className="text-slate-600">
            Replenish Product
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
              defaultValue={todayInCompanyTz}
              // required={true}
            />
            <div className="space-y-1">
              <label className="font-medium text-slate-600">
                Vendor <span className="text-red-500">*</span>
              </label>

              <Selector
                label={(vendor: Vendor | null) =>
                  vendor
                    ? vendor?.companyName ||
                      vendor?.name ||
                      `Vendor ${vendor.id}`
                    : "Vendor"
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
                  <p>{vendor?.companyName || vendor.name}</p>
                )}
                items={vendors}
                onSearch={(search: string) =>
                  vendors.filter(
                    (vendor) =>
                      vendor?.companyName
                        ?.toLowerCase()
                        ?.includes(search.toLowerCase()) ||
                      (vendor?.name?.toLowerCase() || "").includes(
                        search.toLowerCase(),
                      ),
                  )
                }
                openState={[vendorOpen, setVendorOpen]}
                selectedItem={vendor}
                setSelectedItem={setVendor}
                border={true}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <SlimInput name="quantity" required={true} label="Quantity" />

            <SlimInput name="price" required={true} label="Total Price" />

            <SlimInput
              defaultValue={lastUnit || ""}
              name="unit"
              required={true}
              label="Unit"
            />
            <SlimInput name="lot" required={false} label="Lot#" />
          </div>

          <div className="space-y-1">
            <label htmlFor="notes" className="font-medium text-slate-600">
              {" "}
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
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
          <DialogClose className="rounded-xl mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors border">
            Cancel
          </DialogClose>
          <Submit
            className="rounded-xl px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary to-[#5a66ee] shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100 transition-all duration-200"
            formAction={handleSubmit}
          >
            Submit
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

    console.log("Inside handler function==>", vendor);

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
        <button className="w-28 rounded-md bg-[#69DBD0] p-1 text-white">
          Replenish
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-full w-[96%] max-w-xl overflow-y-auto md:w-[30rem]"
        form
      >
        <DialogHeader>
          <DialogTitle>Replenish Product</DialogTitle>
        </DialogHeader>
        <FormError />
        <div className="flex flex-col gap-3 p-2">
          <SlimInput
            name="date"
            type="date"
            className="col-span-1"
            defaultValue={todayInCompanyTz}
          />
          {/* TODO: make reusable component */}
          <div>
            <label>Vendor</label>

            <Selector
              label={(vendor: Vendor | null) =>
                vendor
                  ? vendor?.companyName || vendor?.name || `Vendor ${vendor.id}`
                  : "Vendor"
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
                      search.toLowerCase()
                    )
                )
              }
              openState={[vendorOpen, setVendorOpen]}
              selectedItem={vendor}
              setSelectedItem={setVendor}
            />
          </div>

          <div className="flex flex-wrap gap-3 md:flex-nowrap">
            <SlimInput name="quantity" required={false} />

            <div>
              <label htmlFor="price" className="px-2 font-medium">
                Total Price
              </label>
              <div className="#mt-1 flex gap-1 rounded-sm border border-primary-foreground bg-background px-2 py-0.5 leading-6">
                <span className="text-lg">$</span>
                <input
                  type="text"
                  name="price"
                  className="w-full rounded-sm border border-slate-400 px-2 py-0.5 outline-none"
                  id="price"
                />
              </div>
            </div>

            <SlimInput
              defaultValue={lastUnit || ""}
              name="unit"
              required={false}
            />
            <SlimInput name="lot" required={false} />
          </div>

          <div className="col-span-2">
            <label htmlFor="notes"> Notes</label>
            <textarea
              id="notes"
              name="notes"
              className="h-28 w-full rounded-sm border border-primary-foreground border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose className="rounded-lg border-2 border-slate-400 p-2">
            Cancel
          </DialogClose>
          <Submit
            className="mb-2 flex items-center justify-center rounded-lg border bg-[#6571FF] px-5 py-2 text-white md:mb-0"
            formAction={handleSubmit}
          >
            Submit
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

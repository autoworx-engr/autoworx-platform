"use client";

import { useEffect, useState, useTransition } from "react";
import moment from "moment-timezone";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone"; // ← adjust path if needed

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
import { InventoryProductType } from "@prisma/client";
import { useProduct as productUse } from "../../../../actions/inventory/useProduct";
import { useFormErrorStore } from "@/stores/form-error";
import { cn } from "@/lib/cn";

type TProps = {
  productId: number;
  productType: InventoryProductType;
  invoiceIds: { id: string; clientName: string }[];
  cost: number;
};

export default function UseProductForm({
  productId,
  productType,
  invoiceIds,
  cost,
}: TProps) {
  const [open, setOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState<{
    id: string;
    clientName: string;
  } | null>(null);

  const { showError, clearError } = useFormErrorStore();
  const [pending, startTransition] = useTransition();

  const companyTz = useCompanyTimezone();
  const todayInCompanyTz = moment().tz(companyTz).format("YYYY-MM-DD");

  // TODO: Add validation for quantity
  async function handleSubmit(formData: FormData) {
    const date = (formData.get("date") as string) || todayInCompanyTz; // "YYYY-MM-DD"
    const quantity = (formData.get("quantity") as string) || "";
    const notes = (formData.get("notes") as string) || "";

    const qNum = Number(quantity);
    if (!qNum || !Number.isFinite(qNum) || qNum <= 0) {
      showError({ message: "Quantity must be a positive number." });
      return;
    }

    // Parse "YYYY-MM-DD" in company timezone to a real Date
    const zonedDate = moment.tz(date, "YYYY-MM-DD", companyTz).toDate();

    const res = await productUse({
      productId,
      date: zonedDate, // ✅ aligned with company timezone
      quantity: quantity, // keep as string if your action expects string
      notes,
      invoiceId: invoiceId?.id,
    });

    if (res.type === "success") {
      setOpen(false);
      setInvoiceId(null);
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

  useEffect(() => {
    setInvoiceId(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="
          w-28 rounded-lg px-4 py-2 text-sm font-semibold text-white
          bg-gradient-to-r from-[#FF6262] to-[#ff4f4f]
          shadow-[0_4px_14px_0_rgba(255,98,98,0.39)]
          hover:shadow-[0_6px_20px_rgba(255,98,98,0.23)]
          hover:-translate-y-0.5
          active:translate-y-0 active:scale-100
          transition-all duration-300 ease-in-out
        ">
          {productType === "Product" ? "Loss" : "Use"}
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[80%] w-[96%] max-w-xl grid-rows-[auto,1fr,auto] thin-scrollbar" form>
        <DialogHeader>
          <DialogTitle className="text-slate-600">
            {productType === "Product" ? "Loss" : "Use"} Product
          </DialogTitle>
        </DialogHeader>

        <FormError />

        <div className="gap-5 overflow-y-auto pl-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SlimInput
              name="date"
              type="date"
              label="Date"
              defaultValue={todayInCompanyTz}
            />
            <SlimInput
              name="quantity"
              label="Quantity"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SlimInput
              name="cost"
              label="Cost"
              defaultValue={cost}
              disabled
            />

            {productType === "Product" && (
              <div className="space-y-1">
                <label className="font-medium text-slate-600">Invoice</label>
                <Selector
                  label={(invoice: { id: string; clientName: string } | null) =>
                    invoice
                      ? `${invoice.id} - ${invoice.clientName}`
                      : "Select Invoice"
                  }
                  items={invoiceIds}
                  selectedItem={invoiceId}
                  setSelectedItem={setInvoiceId}
                  displayList={(invoice) => (
                    <p>
                      <strong>{invoice.id}</strong> - {invoice.clientName}
                    </p>
                  )}
                  newButton={<></>}
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="notes" className="font-medium text-slate-600"> Notes</label>
            <textarea
              id="notes"
              name="notes"
              required={false}
              className={cn("h-24 w-full rounded-md border border-slate-300 outline-none bg-background px-3 py-2 leading-6 transition-all duration-300 thin-scrollbar",
                "bg-white/80 backdrop-blur-sm dark:bg-slate-900/50",
                "text-slate-600 dark:text-slate-300 placeholder:text-slate-400",
                "focus:border-[#6571FF]/60 focus:ring-2 focus:ring-[#6571FF]/40",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose className="
            rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 mt-2 md:mt-0 
          hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
            transition-colors border
          ">
            Cancel
          </DialogClose>
          <Submit
            className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200
                disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed disabled:shadow-none
              "
            formAction={(fromData: FormData) => {
              startTransition(() => handleSubmit(fromData));
              return Promise.resolve();
            }}
            disabled={pending}
          >
            Submit
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

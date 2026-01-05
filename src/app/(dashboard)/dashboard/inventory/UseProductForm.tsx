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
        <button className="w-28 rounded-md bg-[#FF6262] p-1 text-white">
          {productType === "Product" ? "Loss" : "Use"}
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-full w-[96%] max-w-xl md:w-[30rem]" form>
        <DialogHeader>
          <DialogTitle>
            {productType === "Product" ? "Loss" : "Use"} Product
          </DialogTitle>
        </DialogHeader>

        <FormError />

        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-2">
          <SlimInput
            name="date"
            type="date"
            className="col-span-1"
            // ✅ default value in the company timezone
            defaultValue={todayInCompanyTz}
          />
          <br className="block md:hidden" />

          <SlimInput name="quantity" className="col-span-1" />
          <br className="block md:hidden" />

          <SlimInput
            name="cost"
            className="col-span-1"
            defaultValue={cost}
            disabled
          />

          {productType === "Product" && (
            <div className="col-span-2">
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

          <div className="col-span-2">
            <label htmlFor="notes"> Notes</label>
            <textarea
              id="notes"
              name="notes"
              required={false}
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

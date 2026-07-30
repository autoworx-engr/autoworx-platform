"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/Dialog";
import Submit from "@/components/Submit";
import { useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { deleteInvoice } from "@/actions/estimate/invoice/delete";
import { Checkbox } from "antd";
import { errorToast, successToast } from "@/lib/toast";
import { InvoiceType } from "@prisma/client";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { Trash2 } from "lucide-react";

export default function DeleteEstimateButton() {
  const [open, setOpen] = useState(false);
  const [isReplenishInventory, setIsReplenishInventory] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const invoiceType = useEstimateCreateStore((state) => state.type);

  async function handleDelete() {
    if (pathname?.includes("/dashboard/estimate/edit/")) {
      const { id } = params as { id: string };
      const res = await deleteInvoice({
        id,
        replenishInventory: isReplenishInventory,
      });
      if (res.type === "success") {
        const redirectPath =
          res.data.type === InvoiceType.Invoice
            ? "/dashboard/estimate/invoices"
            : "/dashboard/estimate";
        successToast(
          `${invoiceType === InvoiceType.Invoice ? "Invoice" : "Estimate"} deleted successfully!`,
        );
        router.push(redirectPath);
      } else if (res.type === "globalError") {
        errorToast(res.message);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-md bg-red-400 px-3 py-1 text-white hover:bg-red-500"
          aria-label="Delete"
        >
          <Trash2 size={18} />
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        form
      >
        <DialogHeader>
          <DialogTitle>
            Delete{" "}
            {invoiceType === InvoiceType.Invoice ? "Invoice" : "Estimate"}
          </DialogTitle>
        </DialogHeader>

        <p>
          Are you sure you want to delete this{" "}
          {invoiceType === InvoiceType.Invoice ? "invoice" : "estimate"}?
        </p>
        {invoiceType === InvoiceType.Invoice && (
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms1"
              checked={isReplenishInventory}
              onChange={(e) => setIsReplenishInventory(e.target.checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms1"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Will you replenish the inventory?
              </label>
              <p className="text-sm text-muted-foreground">
                Replenish inventory with returned invoice materials.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose className="rounded-lg border-2 border-slate-400 p-2">
            Cancel
          </DialogClose>
          <Submit
            className="rounded-lg border bg-red-500 px-5 py-2 text-white hover:bg-red-600"
            formAction={handleDelete}
          >
            Delete
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import type { InventoryShortage } from "@/actions/estimate/invoice/checkInventory";
import { checkInventoryForInvoiceSave } from "@/actions/estimate/invoice/checkInventory";
import { notifyInventoryShortage } from "@/actions/estimate/invoice/notifyInventoryShortage";
import InventoryShortageDialog from "@/components/inventory/InventoryShortageDialog";
import Submit from "@/components/Submit";
import { useInventoryConfirm } from "@/hooks/useInventoryConfirm";
import { useInvoiceCreate } from "@/hooks/useInvoiceCreate";
import { cn } from "@/lib/cn";
import { errorToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { InvoiceType } from "@prisma/client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

export default function ConvertButton({
  text,
  icon,
  type,
  className,
}: {
  text: string;
  icon: React.ReactNode;
  type: InvoiceType;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const createInvoice = useInvoiceCreate(type);
  const invoiceId = useEstimateCreateStore((state) => state.invoiceId);
  const items = useEstimateCreateStore((state) => state.items);
  const status = useListsStore((state) => state.status);
  const resetEstimateCreate = useEstimateCreateStore((state) => state.reset);

  const resetLists = useListsStore((state) => state.reset);

  const { runWithInventoryCheck, dialogProps } = useInventoryConfirm();

  const targetType =
    status?.title === "In Progress" ? InvoiceType.Invoice : type;

  const fallbackTimer = useRef<number | null>(null);

  const clearFallback = useCallback(() => {
    if (fallbackTimer.current !== null) {
      window.clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
  }, []);

  useEffect(() => {
    clearFallback();
  }, [pathname, clearFallback]);

  useEffect(() => clearFallback, [clearFallback]);

  function goToList(savedId?: string) {
    // Carry the just-saved id so the table view auto-opens its modal.
    const openParam = savedId ? `?openEstimateId=${savedId}` : "";
    const target =
      type === "Estimate"
        ? `/dashboard/estimate${openParam}`
        : `/dashboard/estimate/invoices${openParam}`;

    router.replace(target);

    clearFallback();
    fallbackTimer.current = window.setTimeout(() => {
      fallbackTimer.current = null;
      if (window.location.pathname.includes("/estimate/create")) {
        window.location.assign(target);
      }
    }, 3000);
  }

  async function save(
    allowInsufficientInventory: boolean,
    shortages: InventoryShortage[],
  ) {
    try {
      const res = await createInvoice(false, allowInsufficientInventory);

      if (res.type !== "success") {
        const message =
          "errorSource" in res && res.errorSource?.length
            ? res.errorSource[0].message
            : res.message;
        errorToast(message || "Could not save. Please try again.");
        return;
      }

      const savedId = res.data?.id ?? invoiceId;

      if (shortages.length) {
        notifyInventoryShortage({
          invoiceId: savedId,
          shortages,
          companyId: res.data?.companyId,
          reason: "saved-anyway",
        }).catch((err) => console.error("notifyInventoryShortage failed", err));
      }

      goToList(savedId);
      // resetEstimateCreate();
      // resetLists();
    } catch (err) {
      console.error("Saving the estimate failed", err);
      errorToast("Could not save. Please try again.");
    }
  }

  async function handleSubmit() {
    try {
      await runWithInventoryCheck(
        () =>
          checkInventoryForInvoiceSave({
            invoiceId,
            materials: items.flatMap((item) => item.materials ?? []),
            targetType,
          }),
        save,
      );
    } catch (err) {
      console.error("Inventory check failed", err);
      errorToast("Could not verify inventory. Please try again.");
    }
  }

  return (
    <>
      <form className="px-3">
        <Submit
          className={cn(
            "flex w-full items-center justify-center gap-2 text-nowrap rounded-lg px-4 py-2 text-center text-sm font-semibold tracking-wide transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale-[0.5]",
            !className?.includes("bg-") &&
              "bg-slate-800 text-white shadow-lg shadow-slate-200 ring-1 ring-slate-900/5 hover:bg-slate-900",
            className,
          )}
          formAction={handleSubmit}
        >
          {icon && <span className="shrink-0 opacity-90">{icon}</span>}
          <span>{text}</span>
        </Submit>
      </form>

      <InventoryShortageDialog {...dialogProps} />
    </>
  );
}

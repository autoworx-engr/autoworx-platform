"use client";

import { InvoiceType } from "@prisma/client";
import Submit from "@/components/Submit";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { useInvoiceCreate } from "@/hooks/useInvoiceCreate";
import { errorToast } from "@/lib/toast";
import { useListsStore } from "@/stores/lists";
import { useEstimateCreateStore } from "@/stores/estimate-create";

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
  const createInvoice = useInvoiceCreate(type);
  const invoiceId = useEstimateCreateStore((state) => state.invoiceId);
  const resetEstimateCreate = useEstimateCreateStore((state) => state.reset);

  const resetLists = useListsStore((state) => state.reset);

  async function handleSubmit() {
    const res = await createInvoice();
    if (res.type === "success") {
      // Carry the just-saved id so the table view auto-opens its modal.
      const savedId = res.data?.id ?? invoiceId;
      const openParam = savedId ? `?openEstimateId=${savedId}` : "";
      if (type === "Estimate") {
        router.replace(`/dashboard/estimate${openParam}`);
      } else {
        router.replace(`/dashboard/estimate/invoices${openParam}`);
      }
      // resetEstimateCreate();
      // resetLists();
    } else if (res.type === "globalError") {
      errorToast(
        res.errorSource?.length ? res.errorSource[0].message : res.message,
      );
      return;
    }
  }

  return (
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
  );
}

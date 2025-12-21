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
  const resetEstimateCreate = useEstimateCreateStore((state) => state.reset);

  const resetLists = useListsStore((state) => state.reset);

  async function handleSubmit() {
    const res = await createInvoice();
    if (res.type === "success") {
      if (type === "Estimate") {
        router.push("/dashboard/estimate");
      } else {
        router.push("/dashboard/estimate/invoices");
      }
      resetEstimateCreate();
      resetLists();
    } else if (res.type === "globalError") {
      errorToast(
        res.errorSource?.length ? res.errorSource[0].message : res.message
      );
      return;
    }
  }

  return (
    <form className="px-3">
      <Submit
        className={cn(
          "flex w-full items-center justify-center gap-2 text-nowrap rounded border border-solid border-slate-600 p-2 text-center text-sm disabled:opacity-35",
          className
        )}
        formAction={handleSubmit}
      >
        {icon}
        {text}
      </Submit>
    </form>
  );
}

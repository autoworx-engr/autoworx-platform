"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { queryKeys } from "@/lib/queryKeys";
import { ShopLead } from "@/types/invoiceLead";
import { getWorkOrderData } from "@/service/work-order/api";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { PencilLineIcon } from "lucide-react";
import TeamWorkOrderDetails from "./TeamWorkOrderDetails";

interface TeamWorkOrderSheetProps {
  lead: ShopLead | null;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export default function TeamWorkOrderSheet({
  lead,
  onOpenChange,
  onEdit,
}: TeamWorkOrderSheetProps) {
  const currentUser = useGetCurrentUser();
  const companyId = currentUser?.companyId;
  const invoiceId = lead?.invoiceId;

  // Same query key as WorkOrderModalBody, so opening Edit reuses this cache
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.getWorkOrderDataKey(invoiceId ?? ""),
    queryFn: () => getWorkOrderData(companyId!, invoiceId!),
    enabled: !!invoiceId && !!companyId,
  });

  return (
    <Sheet open={!!lead} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md"
        aria-describedby={undefined}
      >
        <div className="border-b border-slate-100 px-5 pb-4 pt-5">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            Work Order
          </span>
          <SheetTitle className="mt-2 pr-8 text-xl font-bold text-slate-900">
            {lead?.name || "No client"}
          </SheetTitle>
          <p className="mt-0.5 font-mono text-xs text-slate-400">
            #{lead?.invoiceId}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <p className="text-sm text-slate-400">Loading work order…</p>
          )}
          {isError && (
            <p className="text-sm text-rose-500">
              Could not load this work order.
            </p>
          )}
          {!isLoading && !isError && <TeamWorkOrderDetails data={data} />}
        </div>

        <div className="border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <PencilLineIcon className="size-4" />
            Edit Work Order
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

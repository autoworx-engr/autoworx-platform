"use client";

import CarLoading from "@/components/common/CarLoading";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { queryKeys } from "@/lib/queryKeys";
import { ShopLead } from "@/types/invoiceLead";
import { getWorkOrderData } from "@/service/work-order/api";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { BookCheck, PencilLineIcon } from "lucide-react";
import TeamWorkOrderDetails from "./TeamWorkOrderDetails";

interface TeamWorkOrderSheetProps {
  lead: ShopLead | null;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onViewInvoice: () => void;
}

export default function TeamWorkOrderSheet({
  lead,
  onOpenChange,
  onEdit,
  onViewInvoice,
}: TeamWorkOrderSheetProps) {
  const currentUser = useGetCurrentUser();
  const companyId = currentUser?.companyId;
  const invoiceId = lead?.invoiceId;

  // Same gate DraggableLead uses for its View Invoice action
  const canViewInvoice =
    currentUser?.employeeType === "Manager" ||
    currentUser?.employeeType === "Admin" ||
    currentUser?.isSuperAdmin === true;

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
            <div className="flex flex-col items-center justify-center py-10">
              <CarLoading />
              <p className="mt-2 text-sm text-slate-400">Loading work order…</p>
            </div>
          )}
          {isError && (
            <p className="text-sm text-rose-500">
              Could not load this work order.
            </p>
          )}
          {!isLoading && !isError && <TeamWorkOrderDetails data={data} />}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <PencilLineIcon className="size-4" />
            Edit Work Order
          </button>

          {canViewInvoice && (
            <button
              type="button"
              onClick={onViewInvoice}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <BookCheck className="size-4" />
              View Invoice
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { formatCurrency } from "@/utils/formatCurrency";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";
import { Tooltip } from "antd";
import { ArrowDown } from "lucide-react";
import Link from "next/link";
import { TInvoice } from "./page";

type TProps = {
  invoice: TInvoice & {
    costPrice: number;
    profitPrice: number;
    inventoryLossAmount: number;
    materialLossAmount: number;
    laborLossAmount: number;
    totalLossAmount: number;
    materialLossDetails: {
      name: string;
      loss: number;
      isFromInventory: boolean;
    }[];
  };
  index: number;
  timezone: string;
};

export default function RevenueMobileCard({ invoice, timezone }: TProps) {
  const refundedAmount =
    invoice?.Refund?.reduce(
      (acc, refund) => acc + Number(refund.amount || 0),
      0,
    ) || 0;

  const profit = Number(invoice.profitPrice?.toString() || 0);
  const hasRefund = refundedAmount > 0;

  const formattedDate = FormatUtcToTimezone(
    invoice.deliveredAt,
    timezone,
    "MMM Do, YYYY",
  );

  // Display the actual cost (what we spent)
  const displayCost = Number(invoice.costPrice);

  // Check if there are any losses to show the exclamation mark
  const hasLosses = invoice.totalLossAmount > 0;

  // Generate loss details for tooltip
  const lossDetails = [];

  // Inventory losses (lost products)
  if (invoice.inventoryLossAmount > 0) {
    const inventoryMaterialNames = invoice.InventoryProductHistory?.map(
      (item) => item.product?.name,
    ).filter(Boolean);
    lossDetails.push(`Inventory Loss: ${inventoryMaterialNames?.join(", ")}`);
  }

  // Material losses (show actual material names with losses)
  if (
    invoice.materialLossAmount > 0 &&
    invoice.materialLossDetails?.length > 0
  ) {
    const materialNames = invoice.materialLossDetails.map(
      (detail) => `${detail.name} ($${detail.loss.toFixed(2)})`,
    );
    lossDetails.push(`Material Loss: ${materialNames.join(", ")}`);
  }

  // Labor losses
  if (invoice.laborLossAmount > 0) {
    lossDetails.push(
      `Labor Loss: Technician cost exceeds charges ($${invoice.laborLossAmount.toFixed(2)})`,
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 dark:ring-slate-700/50 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <InvoiceModal
          invoiceId={invoice.id}
          buttonChild={<button>#{invoice.id}</button>}
          buttonChildClassName="shrink-0 font-semibold text-primary"
        />
        <span className="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">
          {formattedDate}
        </span>
      </div>

      <div className="mb-1 truncate text-sm font-medium text-slate-500 dark:text-slate-400">
        {invoice.vehicle?.make} {invoice.vehicle?.model}{" "}
        {invoice.vehicle?.submodel}
      </div>

      <div className="mb-3">
        <Link
          href={`/dashboard/estimate/view/${invoice.id}`}
          className="truncate text-base font-semibold text-slate-700 hover:text-primary dark:text-white sm:text-lg"
        >
          {invoice?.client?.firstName} {invoice?.client?.lastName}
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Price
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {formatCurrency(Number(invoice.grandTotal?.toString() || 0))}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Cost
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
            {formatCurrency(displayCost)}
            {hasLosses && (
              <Tooltip title={lossDetails?.join(" | ") || "Loss detected"}>
                <svg
                  viewBox="0 0 64 64"
                  aria-hidden="true"
                  role="img"
                  width="12"
                  height="12"
                  preserveAspectRatio="xMidYMid meet"
                  fill="#000000"
                  className="shrink-0"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    {" "}
                    <g fill="#ff0000">
                      {" "}
                      <path d="M37 42.4H27L23 2h18z"> </path>{" "}
                      <ellipse cx="32" cy="54.4" rx="7.7" ry="7.6">
                        {" "}
                      </ellipse>{" "}
                    </g>{" "}
                  </g>
                </svg>
              </Tooltip>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Profit
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {formatCurrency(profit)}
          </div>
          {hasRefund && (
            <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-red-500">
              <ArrowDown size={12} strokeWidth={2} className="shrink-0" />
              <span>{formatCurrency(refundedAmount)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

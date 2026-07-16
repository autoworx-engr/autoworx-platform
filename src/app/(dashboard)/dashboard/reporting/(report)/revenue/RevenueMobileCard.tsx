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

export default function RevenueMobileCard({
  invoice,
  index,
  timezone,
}: TProps) {
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
    <div
      className={`rounded-lg border p-4 shadow-md ${index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]"}`}
    >
      <div className="mb-2 flex items-center justify-between">
        {/* <Link
          href={`/dashboard/estimate/view/${invoice.id}`}
          className="font-semibold text-primary"
        >
          {invoice.id}
        </Link> */}
        <InvoiceModal
          invoiceId={invoice.id}
          buttonChild={<button>{invoice.id}</button>}
          buttonChildClassName="font-semibold text-primary"
        />
        <span className="font-semibold">{formattedDate}</span>
      </div>

      <div className="mb-2 font-semibold text-[#66738C]">
        {invoice.vehicle?.make} {invoice.vehicle?.model}{" "}
        {invoice.vehicle?.submodel}
      </div>

      <div className="mb-2">
        <Link
          href={`/dashboard/estimate/view/${invoice.id}`}
          className="text-lg font-semibold text-[#66738C]"
        >
          {invoice?.client?.firstName} {invoice?.client?.lastName}
        </Link>
      </div>

      <div className="flex justify-between flex-wrap gap-2 border-t pt-2">
        <div>
          <div className="text-sm text-gray-500">Price</div>
          <div className="font-semibold text-[#66738C]">
            {formatCurrency(Number(invoice.grandTotal?.toString() || 0))}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Cost</div>
          <div className="flex items-center gap-2 font-semibold text-[#66738C]">
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
          <div className="text-sm text-gray-500">Profit</div>
          <div className="flex flex-col items-center gap-1 font-semibold text-[#66738C]">
            <span>{formatCurrency(profit)}</span>

            {hasRefund && (
              <div className="flex items-center gap-1 text-red-500 text-xs font-normal">
                <ArrowDown size={16} strokeWidth={2} />
                <span>{formatCurrency(refundedAmount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

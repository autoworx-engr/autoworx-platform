import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { Tooltip } from "antd";
import Link from "next/link";
import { TInvoice } from "./page";
import moment from "moment-timezone";
import { Refund } from "@prisma/client";
import { ArrowDown } from "lucide-react";

type TProps = {
  invoice: TInvoice & {
    refund: Refund;
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
  totalLossAmount?: number;
  lossDetails?: string[];
  timezone: string;
};

export default function RevenueTableRow({
  invoice,
  index,
  totalLossAmount,
  lossDetails,
  timezone,
}: TProps) {
  // Display the actual cost (what we spent)

  const refundedAmount =
    invoice?.Refund?.reduce(
      (acc, refund) => acc + Number(refund.amount || 0),
      0,
    ) || 0;

  const totalProfit = Number((invoice as any).profitPrice).toFixed(2);

  const hasRefund = refundedAmount > 0;

  const displayCost = Number(invoice.costPrice);

  // Check if there are any losses to show the exclamation mark
  const hasLosses = (totalLossAmount || 0) > 0;

  return (
    <tr
      className={cn(
        "cursor-pointer py-3 duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50",
        index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]",
      )}
    >
      <td className="px-4 py-2 text-left">
        <Link
          className="text-blue-500"
          href={`/dashboard/client/${invoice.client?.id}`}
        >
          {invoice?.client?.firstName} {invoice?.client?.lastName!}
        </Link>
      </td>
      <td className="px-4 py-2 text-left">
        {invoice.vehicle?.year !== 0 ? invoice.vehicle?.year : ""}{" "}
        {invoice.vehicle?.make} {invoice.vehicle?.model}{" "}
        {invoice.vehicle?.submodel} {invoice.vehicle?.other}
      </td>
      <td className="px-4 py-2 text-left">
        <InvoiceModal
          invoiceId={invoice.id}
          buttonChild={<button>{invoice.id}</button>}
          buttonChildClassName="text-blue-500"
        />
      </td>
      <td className="px-4 py-2 text-left">
        {invoice?.deliveredAt
          ? moment.tz(invoice.deliveredAt, timezone).format("MM/DD/YYYY")
          : ""}
      </td>
      <td className="px-4 py-2 text-left">
        {formatCurrency(Number(invoice.grandTotal?.toString() || 0))}
      </td>
      <td className="px-4 py-2 text-left">
        <div className="flex items-center gap-2">
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
      </td>
      <td className="px-4 py-2 text-left">
        <div>
          <span className="font-medium text-[#66738C]">
            {formatCurrency(Number(totalProfit))}
          </span>

          {hasRefund && (
            <div className="flex items-center gap-1 text-red-500 text-xs font-normal">
              <ArrowDown size={14} strokeWidth={2} />
              <span>{formatCurrency(refundedAmount)}</span>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

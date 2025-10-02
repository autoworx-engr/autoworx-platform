import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { Tooltip } from "antd";
import Link from "next/link";
import { FaExclamation } from "react-icons/fa";
import { TInvoice } from "./page";
import moment from "moment-timezone";

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
  const displayCost = Number(invoice.costPrice);

  // Check if there are any losses to show the exclamation mark
  const hasLosses = (totalLossAmount || 0) > 0;

  return (
    <tr
      className={cn(
        "cursor-pointer rounded-md py-3",
        index % 2 === 0 ? "bg-background" : "bg-blue-100"
      )}
    >
      <td className="border-b px-4 py-2 text-left">
        <Link
          className="text-blue-500"
          href={`/dashboard/client/${invoice.client?.id}`}
        >
          {invoice?.client?.firstName} {invoice?.client?.lastName!}
        </Link>
      </td>
      <td className="border-b px-4 py-2 text-left">
        {invoice.vehicle?.year !== 0 ? invoice.vehicle?.year : ""}{" "}
        {invoice.vehicle?.make} {invoice.vehicle?.model}{" "}
        {invoice.vehicle?.submodel} {invoice.vehicle?.other}
      </td>
      <td className="border-b px-4 py-2 text-left">
        <InvoiceModal
          invoiceId={invoice.id}
          buttonChild={<button>{invoice.id}</button>}
          buttonChildClassName="text-blue-500"
        />
      </td>
      <td className="border-b px-4 py-2 text-left">
        {invoice?.deliveredAt
          ? moment.tz(invoice.deliveredAt, timezone).format("MM/DD/YYYY")
          : ""}
      </td>
      <td className="border-b px-4 py-2 text-left">
        {formatCurrency(Number(invoice.grandTotal?.toString() || 0))}
      </td>
      <td className="border-b px-4 py-2 text-left">
        <div className="flex items-center gap-2">
          {formatCurrency(displayCost)}
          {hasLosses && (
            <Tooltip title={lossDetails?.join(" | ") || "Loss detected"}>
              <FaExclamation color="red" size={12} />
            </Tooltip>
          )}
        </div>
      </td>
      <td className="border-b px-4 py-2 text-left">
        {formatCurrency(Number(invoice.profitPrice.toString()))}
      </td>
    </tr>
  );
}

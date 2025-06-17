import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { Tooltip } from "antd";
import Link from "next/link";
import { FaExclamation } from "react-icons/fa";
import { TInvoice } from "./page";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";

type TProps = {
  invoice: TInvoice & { costPrice: number; profitPrice: number };
  index: number;
  inventoryLostTotalCost?: number;
  inventoryMaterialName?: string[];
  timezone: string;
};

export default function RevenueTableRow({
  invoice,
  index,
  inventoryLostTotalCost,
  inventoryMaterialName,
  timezone,
}: TProps) {
  const formattedDate = FormatUtcToTimezone(
    invoice?.deliveredAt!,
    timezone,
    "MMM Do, YYYY",
  );

  const totalCostWithLostCost =
    Number(invoice.costPrice) + inventoryLostTotalCost!;
  return (
    <tr
      className={cn(
        "cursor-pointer rounded-md py-3",
        index % 2 === 0 ? "bg-background" : "bg-blue-100",
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
        {invoice.vehicle?.make} {invoice.vehicle?.model}{" "}
        {invoice.vehicle?.submodel}
      </td>
      <td className="border-b px-4 py-2 text-left">
        <InvoiceModal
          invoiceId={invoice.id}
          buttonChild={<button>{invoice.id}</button>}
          buttonChildClassName="text-blue-500"
        />
      </td>
      <td className="border-b px-4 py-2 text-left">{formattedDate}</td>
      <td className="border-b px-4 py-2 text-left">
        {formatCurrency(Number(invoice.grandTotal?.toString() || 0))}
      </td>
      <td className="border-b px-4 py-2 text-left">
        <div className="flex items-center gap-2">
          {formatCurrency(totalCostWithLostCost)}
          {inventoryLostTotalCost && (
            <Tooltip title={inventoryMaterialName?.join() || ""}>
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

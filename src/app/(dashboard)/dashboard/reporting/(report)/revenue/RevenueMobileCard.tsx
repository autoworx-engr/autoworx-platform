"use client";
import { formatCurrency } from "@/utils/formatCurrency";
import { TInvoice } from "./page";
import Link from "next/link";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";

type TProps = {
  invoice: TInvoice & { costPrice: number; profitPrice: number };
  index: number;
  timezone: string;
};

export default function RevenueMobileCard({
  invoice,
  index,
  timezone,
}: TProps) {
  const formattedDate = FormatUtcToTimezone(
    invoice.deliveredAt,
    timezone,
    "MMM Do, YYYY",
  );

  return (
    <div
      className={`rounded-lg border p-4 shadow-md ${index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]"}`}
    >
      <div className="mb-2 flex items-center justify-between">
        {/* <Link
          href={`/dashboard/estimate/view/${invoice.id}`}
          className="font-semibold text-[#6571FF]"
        >
          {invoice.id}
        </Link> */}
        <InvoiceModal
          invoiceId={invoice.id}
          buttonChild={<button>{invoice.id}</button>}
          buttonChildClassName="font-semibold text-[#6571FF]"
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

      <div className="flex justify-between border-t pt-2">
        <div>
          <div className="text-sm text-gray-500">Price</div>
          <div className="font-semibold text-[#66738C]">
            {formatCurrency(Number(invoice.grandTotal?.toString() || 0))}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Cost</div>
          <div className="font-semibold text-[#66738C]">
            {formatCurrency(Number(invoice.costPrice))}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Profit</div>
          <div className="font-semibold text-[#66738C]">
            {formatCurrency(Number(invoice.profitPrice.toString()))}
          </div>
        </div>
      </div>
    </div>
  );
}

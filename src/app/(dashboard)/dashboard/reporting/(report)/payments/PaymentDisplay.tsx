"use client";

import {
  Column,
  DataTable,
  MobileCard,
  StatTile,
  StatusBadge,
} from "@/components/data-table";
import { formatCurrency } from "@/utils/formatCurrency";
import { Payment, Prisma } from "@prisma/client";
import { ArrowDown } from "lucide-react";
import moment from "moment-timezone";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type PaymentRow = Payment & {
  refundedAmount?: number | null;
  invoice: {
    Refund: any;
    client: { firstName: string; lastName: string | null } | null;
    vehicle: {
      model: string | null;
      year: number | null;
      make: string | null;
      other: string | null;
      id: number;
      type: string | null;
    } | null;
    due: Prisma.Decimal | null;
  } | null;
  other: { paymentMethod: { name: string } | null } | null;
  deposit: { depositMethod: string | null; depositNotes: string | null } | null;
  cash: { receivedCash: string | null } | null;
};

type TProps = {
  paymentInfo: PaymentRow[];
  total: number;
  timezone: string;
  page?: number;
  take?: number;
};

function paymentMethodLabel(row: PaymentRow): string | null {
  if (row.type === "OTHER") return row.other?.paymentMethod?.name ?? null;
  if (row.type === "DEPOSIT")
    return `${row.type} (${row.deposit?.depositMethod || "N/A"})`;
  return row.type;
}

function vehicleLabel(row: PaymentRow): string {
  const v = row.invoice?.vehicle;
  if (!v) return "";
  return [v.year || "", v.make, v.model, v.other].filter(Boolean).join(" ");
}

function clientName(row: PaymentRow): string {
  return `${row.invoice?.client?.firstName ?? ""} ${row.invoice?.client?.lastName ?? ""}`.trim();
}

function RefundLine({ amount }: { amount: number }) {
  return (
    <div className="flex items-center gap-1 text-xs text-red-500">
      <ArrowDown size={14} strokeWidth={2} />
      <span>{formatCurrency(amount)}</span>
    </div>
  );
}

export default function PaymentDisplay({
  paymentInfo,
  total,
  timezone,
  page,
  take,
}: TProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const handlePageChange = (newPage: number, newSize?: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(newPage));
    if (newSize) sp.set("take", String(newSize));
    else sp.delete("take");
    router.push(`${pathname}?${sp.toString()}`);
  };

  const columns: Column<PaymentRow>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <span className="text-slate-700">
          {row.date ? moment.tz(row.date, timezone).format("MM/DD/YYYY") : ""}
        </span>
      ),
    },
    {
      key: "invoice",
      header: "Invoice #",
      cell: (row) => <span className="text-slate-700">{row.invoiceId}</span>,
    },
    {
      key: "client",
      header: "Client Name",
      cell: (row) => (
        <span className="text-slate-700 font-medium">{clientName(row)}</span>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle Info",
      cell: (row) => (
        <span className="text-slate-700">{vehicleLabel(row)}</span>
      ),
    },
    {
      key: "method",
      header: "Payment Method",
      cell: (row) => (
        <span className="text-slate-700">{paymentMethodLabel(row)}</span>
      ),
    },
    {
      key: "amount",
      header: "Total Amount",
      cell: (row) => {
        const refunded = Number(row.refundedAmount) || 0;
        return (
          <div>
            <span className="font-medium text-slate-700">
              {formatCurrency(Number(row.amount))}
            </span>
            {refunded > 0 && <RefundLine amount={refunded} />}
          </div>
        );
      },
    },
    {
      key: "cash",
      header: "Cash Received",
      cell: (row) => (
        <span className="text-slate-700">
          {row.cash?.receivedCash ? row.cash.receivedCash : "N/A"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => {
        const paid = Number(row.invoice?.due) <= 0;
        return (
          <StatusBadge
            tone={paid ? "success" : "danger"}
            label={paid ? "Paid" : "Due"}
          />
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={paymentInfo}
      rowKey={(r) => r.id}
      pagination={{
        currentPage: page || 1,
        pageSize: take || 50,
        totalItems: total,
        onChange: handlePageChange,
        itemLabel: "payments",
      }}
      renderMobileCard={(row) => {
        const paid = Number(row.invoice?.due) <= 0;
        const refunded = Number(row.refundedAmount) || 0;
        return (
          <MobileCard>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-slate-600">
                  {clientName(row) || "—"}
                </h3>
                <p className="mt-0.5 truncate text-sm text-slate-500 font-medium">
                  {vehicleLabel(row)}
                </p>
              </div>
              <StatusBadge
                tone={paid ? "success" : "danger"}
                label={paid ? "Paid" : "Due"}
              />
            </div>

            {/* Stats tiles */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <StatTile
                label="Amount"
                emphasized
                value={
                  <span className="flex flex-col">
                    <span>{formatCurrency(Number(row.amount))}</span>
                    {refunded > 0 && <RefundLine amount={refunded} />}
                  </span>
                }
              />
              <StatTile label="Method" value={paymentMethodLabel(row) ?? "—"} />
              <StatTile
                label="Date"
                value={
                  row.date
                    ? moment.tz(row.date, timezone).format("MM/DD/YYYY")
                    : "—"
                }
              />
              <StatTile label="Invoice #" value={`#${row.invoiceId}`} />
              <StatTile
                fullWidth
                label="Cash Received"
                value={row.cash?.receivedCash ?? "N/A"}
              />
            </div>
          </MobileCard>
        );
      }}
    />
  );
}

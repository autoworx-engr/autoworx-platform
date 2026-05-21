"use client";

import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import {
  Column,
  DataTable,
  MobileCard,
  StatTile,
} from "@/components/data-table";
import { formatCurrency } from "@/utils/formatCurrency";
import { Refund } from "@prisma/client";
import { Tooltip } from "antd";
import { ArrowDown } from "lucide-react";
import moment from "moment-timezone";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TInvoice } from "./page";

type RevenueRow = TInvoice & {
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

type TProps = {
  filteredInvoice: RevenueRow[];
  total: number;
  timezone: string | Date;
  page?: number;
  take?: number;
};

function buildLossDetails(row: RevenueRow): string[] {
  const out: string[] = [];
  if (row.inventoryLossAmount > 0) {
    const names = row.InventoryProductHistory?.map(
      (h) => h.product?.name,
    ).filter(Boolean);
    out.push(`Inventory Loss: ${names?.join(", ")}`);
  }
  if (row.materialLossAmount > 0 && row.materialLossDetails?.length > 0) {
    const names = row.materialLossDetails.map(
      (d) => `${d.name} ($${d.loss.toFixed(2)})`,
    );
    out.push(`Material Loss: ${names.join(", ")}`);
  }
  if (row.laborLossAmount > 0) {
    out.push(
      `Labor Loss: Technician cost exceeds charges ($${row.laborLossAmount.toFixed(2)})`,
    );
  }
  return out;
}

function LossDot({ details }: { details: string[] }) {
  return (
    <Tooltip title={details.join(" | ") || "Loss detected"}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
    </Tooltip>
  );
}

function RefundLine({ amount }: { amount: number }) {
  return (
    <div className="flex items-center gap-1 text-xs text-red-400">
      <ArrowDown size={14} strokeWidth={2} />
      <span>{formatCurrency(amount)}</span>
    </div>
  );
}

function refundedAmount(row: RevenueRow): number {
  return row?.Refund?.reduce((a, r) => a + Number(r.amount || 0), 0) || 0;
}

export default function RevenueDisplay({
  filteredInvoice,
  total,
  timezone,
  page,
  take,
}: TProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tz = timezone as string;

  const handlePageChange = (newPage: number, newSize?: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(newPage));
    if (newSize) sp.set("take", String(newSize));
    else sp.delete("take");
    router.push(`${pathname}?${sp.toString()}`);
  };

  const columns: Column<RevenueRow>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <Link
          className="text-[#6571FF] hover:underline"
          href={`/dashboard/client/${row.client?.id}`}
        >
          {row.client?.firstName} {row.client?.lastName}
        </Link>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle Info",
      cell: (row) => (
        <span className="text-slate-600">
          {row.vehicle?.year !== 0 ? row.vehicle?.year : ""} {row.vehicle?.make}{" "}
          {row.vehicle?.model} {row.vehicle?.submodel} {row.vehicle?.other}
        </span>
      ),
    },
    {
      key: "invoice",
      header: "Invoice #",
      cell: (row) => (
        <InvoiceModal
          invoiceId={row.id}
          buttonChild={<button>{row.id}</button>}
          buttonChildClassName="text-[#6571FF] hover:underline"
        />
      ),
    },
    {
      key: "delivered",
      header: "Date Delivered",
      cell: (row) => (
        <span className="text-slate-600">
          {row?.deliveredAt
            ? moment.tz(row.deliveredAt, tz).format("MM/DD/YYYY")
            : ""}
        </span>
      ),
    },
    {
      key: "price",
      header: "Price",
      cell: (row) => (
        <span className="font-medium text-slate-600">
          {formatCurrency(Number(row.grandTotal?.toString() || 0))}
        </span>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      cell: (row) => {
        const details = buildLossDetails(row);
        return (
          <div className="flex items-center gap-2 text-slate-700">
            <span>{formatCurrency(Number(row.costPrice))}</span>
            {row.totalLossAmount > 0 && <LossDot details={details} />}
          </div>
        );
      },
    },
    {
      key: "profit",
      header: "Profit",
      cell: (row) => {
        const refunded = refundedAmount(row);
        return (
          <div>
            <span className="font-semibold text-slate-700">
              {formatCurrency(Number(Number(row.profitPrice).toFixed(2)))}
            </span>
            {refunded > 0 && <RefundLine amount={refunded} />}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={filteredInvoice}
      rowKey={(r) => r.id}
      pagination={{
        currentPage: page || 1,
        pageSize: take || 50,
        totalItems: total,
        onChange: handlePageChange,
        itemLabel: "invoices",
      }}
      renderMobileCard={(row) => {
        const refunded = refundedAmount(row);
        const details = buildLossDetails(row);
        return (
          <MobileCard>
            {/* Header: client + date */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/client/${row.client?.id}`}
                  className="block text-base font-bold text-slate-500 hover:text-[#6571FF]"
                >
                  {row.client?.firstName} {row.client?.lastName}
                </Link>
                <p className="mt-0.5 truncate text-sm text-slate-500 font-medium">
                  {row.vehicle?.year !== 0 ? row.vehicle?.year : ""}{" "}
                  {row.vehicle?.make} {row.vehicle?.model}{" "}
                  {row.vehicle?.submodel}
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                <InvoiceModal
                  invoiceId={row.id}
                  buttonChild={
                    <button className="rounded-full bg-[#6571FF]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[#6571FF]/85">
                      #{row.id}
                    </button>
                  }
                />
                <span className="text-[12px] font-medium text-slate-400">
                  {row.deliveredAt
                    ? moment.tz(row.deliveredAt, tz).format("MMM D, YYYY")
                    : ""}
                </span>
              </div>
            </div>

            {/* Stats tiles */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <StatTile
                label="Price"
                value={formatCurrency(Number(row.grandTotal?.toString() || 0))}
              />
              <StatTile
                label="Cost"
                value={
                  <span className="flex items-center gap-1.5">
                    {formatCurrency(Number(row.costPrice))}
                    {row.totalLossAmount > 0 && <LossDot details={details} />}
                  </span>
                }
              />
              <StatTile
                label="Profit"
                // emphasized
                value={
                  <span className="flex flex-col">
                    <span>{formatCurrency(Number(row.profitPrice))}</span>
                    {refunded > 0 && <RefundLine amount={refunded} />}
                  </span>
                }
              />
            </div>
          </MobileCard>
        );
      }}
    />
  );
}

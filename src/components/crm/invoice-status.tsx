import { InvoiceStatus } from "@prisma/client";

const styles: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: "bg-zinc-100 text-zinc-700 ring-zinc-400/25",
  [InvoiceStatus.SENT]: "bg-sky-50 text-sky-900 ring-sky-500/20",
  [InvoiceStatus.PAID]: "bg-emerald-50 text-emerald-900 ring-emerald-500/25",
  [InvoiceStatus.VOID]: "bg-zinc-200/60 text-zinc-600 ring-zinc-400/20",
};

const labels: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: "Draft",
  [InvoiceStatus.SENT]: "Sent",
  [InvoiceStatus.PAID]: "Paid",
  [InvoiceStatus.VOID]: "Void",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

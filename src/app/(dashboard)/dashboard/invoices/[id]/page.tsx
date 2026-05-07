import {
  addInvoiceLine,
  archiveInvoice,
  removeInvoiceLine,
  setInvoiceStatus,
  updateInvoiceDraft,
} from "@/actions/crm/invoices";
import { authOptions } from "@/authOptions";
import { CrmPageHeader } from "@/components/crm/page-header";
import { InvoiceStatusBadge } from "@/components/crm/invoice-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  activeInvoiceWhere,
  activeProductWhere,
} from "@/lib/crm-scope";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireSession } from "@/lib/require-session";
import { InvoiceStatus } from "@prisma/client";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  const { id } = await params;
  const n = Number(id);
  if (companyId == null || !Number.isFinite(n)) return { title: "Invoice" };
  const row = await db.invoice.findFirst({
    where: { id: n, companyId, ...activeInvoiceWhere },
    select: { number: true },
  });
  return { title: row?.number ?? "Invoice" };
}

export default async function InvoiceDetailPage({ params, searchParams }: Props) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const { id } = await params;
  const { error: pageError } = await searchParams;
  const invId = Number(id);
  if (!Number.isFinite(invId)) notFound();

  const invoice = await db.invoice.findFirst({
    where: { id: invId, companyId, ...activeInvoiceWhere },
    include: {
      account: true,
      deal: true,
      lines: { orderBy: { id: "asc" } },
    },
  });

  if (!invoice) notFound();

  const products = await db.product.findMany({
    where: { companyId, ...activeProductWhere },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unitPrice: true },
  });

  const dueYmd =
    invoice.dueDate != null ? invoice.dueDate.toISOString().slice(0, 10) : "";

  const statusActions: Partial<Record<InvoiceStatus, InvoiceStatus[]>> = {
    [InvoiceStatus.DRAFT]: [
      InvoiceStatus.SENT,
      InvoiceStatus.PAID,
      InvoiceStatus.VOID,
    ],
    [InvoiceStatus.SENT]: [InvoiceStatus.PAID, InvoiceStatus.VOID],
    [InvoiceStatus.PAID]: [InvoiceStatus.VOID],
  };

  const nextStatuses = statusActions[invoice.status] ?? [];

  return (
    <div>
      <CrmPageHeader
        title={invoice.number}
        description={`${invoice.account.name}${invoice.deal ? ` · ${invoice.deal.title}` : ""}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <InvoiceStatusBadge status={invoice.status} />
          {invoice.status === InvoiceStatus.DRAFT ? (
            <form action={archiveInvoice}>
              <input type="hidden" name="id" value={invoice.id} />
              <Button
                type="submit"
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Delete draft
              </Button>
            </form>
          ) : null}
        </div>
      </CrmPageHeader>

      {pageError === "stock" ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Not enough on-hand stock for one or more product lines. Receive inventory
          first, then mark paid.
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Subtotal
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatMoney(Number(invoice.subtotal))}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tax ({invoice.taxPercent}%)
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatMoney(Number(invoice.taxAmount))}
          </p>
        </div>
        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
            Total
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-teal-700 dark:text-teal-400">
            {formatMoney(Number(invoice.total))}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Issued
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatDate(invoice.issueDate)}
          </p>
        </div>
      </div>

      {nextStatuses.length > 0 ? (
        <Card className="mb-8 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Workflow</CardTitle>
            <CardDescription>Valid transitions only. Paid pulls inventory for product lines.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <form key={s} action={setInvoiceStatus}>
                <input type="hidden" name="id" value={invoice.id} />
                <input type="hidden" name="status" value={s} />
                <Button
                  type="submit"
                  variant={s === InvoiceStatus.VOID ? "outline" : "default"}
                  className={
                    s === InvoiceStatus.VOID ? "border-red-200 text-red-700" : undefined
                  }
                >
                  Mark {s === InvoiceStatus.SENT ? "sent" : s === InvoiceStatus.PAID ? "paid" : "void"}
                </Button>
              </form>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Line items</CardTitle>
              {invoice.status === InvoiceStatus.DRAFT ? (
                <CardDescription>Edit freely while in draft.</CardDescription>
              ) : (
                <CardDescription>Frozen after send — void paid to restore stock if needed.</CardDescription>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Amount</TableHead>
                    {invoice.status === InvoiceStatus.DRAFT ? (
                      <TableHead className="w-[80px]" />
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lines.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={invoice.status === InvoiceStatus.DRAFT ? 5 : 4}
                        className="text-muted-foreground"
                      >
                        No lines.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoice.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <p className="font-medium">{line.description}</p>
                          {line.productId ? (
                            <p className="text-xs text-muted-foreground">
                              Product ID {line.productId} (inventory-linked)
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="tabular-nums">{line.quantity}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatMoney(Number(line.unitPrice))}
                        </TableCell>
                        <TableCell className="tabular-nums font-medium">
                          {formatMoney(Number(line.amount))}
                        </TableCell>
                        {invoice.status === InvoiceStatus.DRAFT ? (
                          <TableCell>
                            <form action={removeInvoiceLine}>
                              <input type="hidden" name="invoiceId" value={invoice.id} />
                              <input type="hidden" name="lineId" value={line.id} />
                              <Button type="submit" variant="ghost" size="sm" className="text-red-600">
                                Remove
                              </Button>
                            </form>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {invoice.status === InvoiceStatus.DRAFT ? (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Add line</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={addInvoiceLine} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <select
                    name="productId"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
                    defaultValue=""
                  >
                    <option value="">Custom (no product / no stock move)</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatMoney(Number(p.unitPrice))}
                      </option>
                    ))}
                  </select>
                  <input
                    name="description"
                    required
                    placeholder="Description"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
                  />
                  <input
                    name="quantity"
                    type="number"
                    min={1}
                    defaultValue={1}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
                  />
                  <input
                    name="unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Unit price"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
                  />
                  <div className="sm:col-span-2">
                    <Button type="submit" variant="secondary">
                      Add line
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Billing party</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <Link
                href={`/dashboard/accounts/${invoice.account.id}`}
                className="font-semibold text-teal-700 hover:underline"
              >
                {invoice.account.name}
              </Link>
              {invoice.deal ? (
                <p className="mt-2">
                  Deal:{" "}
                  <Link
                    href={`/dashboard/deals/${invoice.deal.id}`}
                    className="text-teal-600 hover:underline"
                  >
                    {invoice.deal.title}
                  </Link>
                </p>
              ) : null}
            </CardContent>
          </Card>

          {invoice.status === InvoiceStatus.DRAFT ? (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={updateInvoiceDraft} className="space-y-3">
                  <input type="hidden" name="id" value={invoice.id} />
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={dueYmd}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
                  />
                  <input
                    name="taxPercent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={invoice.taxPercent}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
                  />
                  <textarea
                    name="notes"
                    defaultValue={invoice.notes ?? ""}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
                  />
                  <Button type="submit">
                    Save
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
                {invoice.notes || "—"}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

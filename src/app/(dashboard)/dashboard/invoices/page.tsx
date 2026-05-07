import { createInvoice } from "@/actions/crm/invoices";
import { InvoiceBuilder, type ProductOption } from "@/components/crm/invoice-builder";
import { CrmPageHeader } from "@/components/crm/page-header";
import { InvoiceStatusBadge } from "@/components/crm/invoice-status";
import { ClientSelector, type ClientOption } from "@/components/crm/client-selector";
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
  activeAccountWhere,
  activeDealWhere,
  activeInvoiceWhere,
  activeProductWhere,
} from "@/lib/crm-scope";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireSession } from "@/lib/require-session";
import { InvoiceStatus } from "@prisma/client";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Invoices",
};

const STATUS_FILTERS: (InvoiceStatus | "ALL")[] = [
  "ALL",
  InvoiceStatus.DRAFT,
  InvoiceStatus.SENT,
  InvoiceStatus.PAID,
  InvoiceStatus.VOID,
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; q?: string }>;
}) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const sp = await searchParams;
  const q = sp.q?.trim();
  const statusParam = sp.status as InvoiceStatus | "ALL" | undefined;
  const statusFilter =
    statusParam && Object.values(InvoiceStatus).includes(statusParam as InvoiceStatus)
      ? (statusParam as InvoiceStatus)
      : undefined;

  const whereInvoice = {
    companyId,
    ...activeInvoiceWhere,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" as const } },
            { account: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [invoices, accounts, deals, products] = await Promise.all([
    db.invoice.findMany({
      where: whereInvoice,
      include: { account: true, deal: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.crmAccount.findMany({
      where: { companyId, ...activeAccountWhere },
      orderBy: { name: "asc" },
      select: { id: true, name: true, industry: true, city: true },
    }),
    db.deal.findMany({
      where: { companyId, ...activeDealWhere },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, accountId: true, stage: true },
      take: 150,
    }),
    db.product.findMany({
      where: { companyId, ...activeProductWhere },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true, unitPrice: true },
      take: 200,
    }),
  ]);

  const clientOptions: ClientOption[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    industry: a.industry,
    city: a.city,
  }));

  const productOptions: ProductOption[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unitPrice: Number(p.unitPrice),
  }));

  return (
    <div>
      <CrmPageHeader
        title="Invoices"
        description="Draft bills, send to AR, mark paid — paid status syncs inventory for product lines."
      />

      {sp.error === "no_lines" ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Add at least one line item before creating an invoice.
        </div>
      ) : null}

      <Card className="mb-8 border-border shadow-sm">
        <CardHeader>
          <CardTitle>New invoice</CardTitle>
          <CardDescription>
            Search and select a client, optionally link a contact and deal, then add line items.
            Choosing a product auto-fills description &amp; price and ties the row to inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createInvoice} className="space-y-6">
            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              {/* Searchable client selector */}
              <ClientSelector
                clients={clientOptions}
                clientName="accountId"
                required
              />

              {/* Deal selector — all deals shown; UX note: filter by account could be added with a client component wrapper */}
              <select
                name="dealId"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
                defaultValue=""
              >
                <option value="">Linked deal (optional)</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} — {d.stage}
                  </option>
                ))}
              </select>

              <input
                name="dueDate"
                type="date"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <input
                name="taxPercent"
                type="number"
                min={0}
                max={100}
                defaultValue={0}
                placeholder="Tax %"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
              />
              <textarea
                name="notes"
                placeholder="Customer-facing or internal notes"
                rows={2}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground sm:col-span-2"
              />
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-foreground">Line items</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Select a product to auto-fill description and price. Add as many rows as
                needed; tax updates live.
              </p>
              <InvoiceBuilder products={productOptions} />
            </div>

            <Button type="submit">Create invoice</Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Invoice register ───────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Billing register</CardTitle>
            <CardDescription>
              Open an invoice to advance status or edit draft lines.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <form method="get" className="flex flex-wrap gap-2">
              {statusFilter ? (
                <input type="hidden" name="status" value={statusFilter} />
              ) : null}
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search # or client"
                className="w-44 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 placeholder:text-muted-foreground"
              />
              <Button type="submit" variant="secondary" size="sm">
                Search
              </Button>
            </form>
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((s) => (
                <Link
                  key={s}
                  href={
                    s === "ALL"
                      ? `/dashboard/invoices${q ? `?q=${encodeURIComponent(q)}` : ""}`
                      : `/dashboard/invoices?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    (s === "ALL" && !statusFilter) || s === statusFilter
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {s === "ALL" ? "All" : s}
                </Link>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Due</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No invoices in this view.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                    <TableCell className="font-medium">{inv.account.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.deal ? (
                        <Link
                          href={`/dashboard/deals/${inv.deal.id}`}
                          className="text-primary hover:underline"
                        >
                          {inv.deal.title}
                        </Link>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">
                      {formatMoney(Number(inv.total))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(inv.dueDate)}
                    </TableCell>
                    <TableCell className="text-end">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

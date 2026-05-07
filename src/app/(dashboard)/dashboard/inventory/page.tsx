import {
  adjustProductStock,
  archiveProduct,
  createProduct,
} from "@/actions/crm/inventory";
import { CrmPageHeader } from "@/components/crm/page-header";
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
import { LOW_STOCK_THRESHOLD } from "@/lib/crm-constants";
import { activeProductWhere } from "@/lib/crm-scope";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { requireSession } from "@/lib/require-session";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inventory",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { q?: string; error?: string };
}) {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const q = searchParams.q?.trim();

  const products = await db.product.findMany({
    where: {
      companyId,
      ...activeProductWhere,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { sku: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
    take: 200,
  });

  const lowStock = products.filter((p) => p.qtyOnHand <= LOW_STOCK_THRESHOLD);

  return (
    <div>
      <CrmPageHeader
        title="Inventory"
        description="SKU catalog with on-hand quantity. Paid invoices deduct stock when lines reference a product."
      />

      {searchParams.error === "stock" ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Adjustment would make quantity negative — not applied.
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active SKUs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200/80 bg-amber-50/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-900">
              Low stock (≤{LOW_STOCK_THRESHOLD})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-amber-950">
              {lowStock.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Catalog value (list)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMoney(
                products.reduce(
                  (s, p) => s + Number(p.unitPrice) * p.qtyOnHand,
                  0,
                ),
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Unit price × on-hand</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8 border-border shadow-sm">
        <CardHeader>
          <CardTitle>Add product</CardTitle>
          <CardDescription>
            Default list price is used when you pick this SKU on an invoice line.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProduct} className="grid max-w-2xl gap-3 sm:grid-cols-2">
            <input
              name="name"
              required
              placeholder="Name"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
            />
            <input
              name="sku"
              placeholder="SKU (optional)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
            />
            <input
              name="unitPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="List price"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
            />
            <input
              name="qtyOnHand"
              type="number"
              min="0"
              placeholder="On-hand qty"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
            />
            <textarea
              name="description"
              placeholder="Notes (optional)"
              rows={2}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9 sm:col-span-2"
            />
            <div className="sm:col-span-2">
              <Button type="submit">
                Save product
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Stock sheet</CardTitle>
          </div>
          <form method="get" className="flex w-full max-w-sm gap-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search name or SKU"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground h-9"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>On hand</TableHead>
                <TableHead>Adjust</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    {q ? "No products match." : "Add your first SKU above."}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.sku ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.qtyOnHand <= LOW_STOCK_THRESHOLD ? (
                        <span className="ml-2 text-xs font-normal text-amber-700">
                          Low
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatMoney(Number(p.unitPrice))}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">
                      {p.qtyOnHand}
                    </TableCell>
                    <TableCell>
                      <form action={adjustProductStock} className="flex gap-1">
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          name="delta"
                          type="number"
                          className="w-16 rounded border border-border px-2 py-1 text-xs"
                          placeholder="+/−"
                        />
                        <Button type="submit" variant="outline" size="sm" className="h-8 text-xs">
                          Apply
                        </Button>
                      </form>
                    </TableCell>
                    <TableCell className="text-end">
                      <form action={archiveProduct} className="inline">
                        <input type="hidden" name="id" value={p.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          Archive
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Use{" "}
        <Link href="/dashboard/invoices" className="text-teal-600 hover:underline">
          Invoices
        </Link>{" "}
        to bill customers; marking paid pulls inventory for product-linked lines.
      </p>
    </div>
  );
}

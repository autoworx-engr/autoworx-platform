"use client";

import {
  Column,
  DataTable,
  MobileCard,
  StatTile,
} from "@/components/data-table";
import { formatCurrency } from "@/utils/formatCurrency";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";
import {
  InventoryProduct,
  InventoryProductHistory,
  Prisma,
} from "@prisma/client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type TProps = {
  inventoryProducts: Prisma.InventoryProductGetPayload<{
    include: { InventoryProductHistory: { where: { type: "Sale" } } };
  }>[];
  timezone: string;
  page?: number;
  take?: number;
};

type PurchaseRow = InventoryProductHistory & {
  calculation: {
    averageCost: number;
    averageSales: number;
    ReturnAndInvestment: string;
    quantitySold: number;
    stockQuantity: number;
  };
  productInfo: InventoryProduct;
  displayIndex: number;
};

function buildRows(
  products: TProps["inventoryProducts"],
): Omit<PurchaseRow, "displayIndex">[] {
  return products
    .flatMap((product) => {
      const sales = product.InventoryProductHistory.filter(
        (h) => h.type === "Sale",
      );
      const purchases = product.InventoryProductHistory.filter(
        (h) => h.type === "Purchase",
      );
      const { totalSalesPrice, quantitySold } = sales.reduce(
        (acc, cur) => {
          acc.totalSalesPrice += Number(cur.price) * Number(cur.quantity);
          acc.quantitySold += Number(cur.quantity);
          return acc;
        },
        { totalSalesPrice: 0, quantitySold: 0 },
      );
      const averageSales = Math.round(totalSalesPrice / (quantitySold || 1));
      const totalPurchaseQty = purchases.reduce(
        (a, h) => a + Number(h.quantity),
        0,
      );
      const totalPurchasePrice = purchases.reduce(
        (a, h) => a + Number(h.price) * Number(h.quantity),
        0,
      );
      const averageCost =
        totalPurchaseQty > 0 ? totalPurchasePrice / totalPurchaseQty : 0;
      const ReturnAndInvestment =
        averageSales > averageCost
          ? (((averageSales - averageCost) / averageCost) * 100).toFixed(2)
          : "0.00";
      const { InventoryProductHistory: _ignore, ...productInfo } = product;
      return purchases.map((p) => ({
        ...p,
        calculation: {
          averageCost,
          averageSales,
          ReturnAndInvestment,
          quantitySold: Number(quantitySold),
          stockQuantity: Number(product.quantity ?? 0),
        },
        productInfo: productInfo as InventoryProduct,
      }));
    })
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
}

function productLink(row: PurchaseRow): string {
  if (row.productInfo.type === "Product")
    return `/dashboard/inventory?view=products&productId=${row.productInfo.id}`;
  if (row.productInfo.type === "Supply")
    return `/dashboard/inventory?view=supplies&productId=${row.productInfo.id}`;
  return "#";
}

export default function InventoryDisplay({
  inventoryProducts,
  timezone,
  page,
  take,
}: TProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const currentPage = page || 1;
  const pageSize = take || 50;
  const search = params.get("search");

  const allRows = buildRows(inventoryProducts);
  const startIdx = (currentPage - 1) * pageSize;
  const visible: PurchaseRow[] = (
    search ? allRows : allRows.slice(startIdx, startIdx + pageSize)
  ).map((r, i) => ({ ...r, displayIndex: search ? i + 1 : startIdx + i + 1 }));

  const handlePageChange = (newPage: number, newSize?: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(newPage));
    if (newSize) sp.set("take", String(newSize));
    else sp.delete("take");
    router.push(`${pathname}?${sp.toString()}`);
  };

  const columns: Column<PurchaseRow>[] = [
    {
      key: "num",
      header: "Product #",
      width: "w-20",
      cell: (row) => (
        <Link
          className="text-[#6571FF] hover:underline"
          href={productLink(row)}
        >
          {row.displayIndex}
        </Link>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <span className="font-medium text-slate-700">
          {row.productInfo.name}
        </span>
      ),
    },
    {
      key: "avgCost",
      header: "Average Cost",
      cell: (row) => (
        <span className="text-slate-700">
          {formatCurrency(row.calculation.averageCost)}
        </span>
      ),
    },
    {
      key: "avgSell",
      header: "Average Sell",
      cell: (row) => (
        <span className="text-slate-700">
          {row.productInfo.type === "Supply"
            ? "—"
            : formatCurrency(row.calculation.averageSales)}
        </span>
      ),
    },
    {
      key: "stockQty",
      header: "Stock Qty.",
      cell: (row) => (
        <span className="text-slate-700">
          {Number(row.productInfo.quantity) ?? 0}
        </span>
      ),
    },
    {
      key: "qtySold",
      header: "Qty. Sold",
      cell: (row) => (
        <span className="text-slate-700">
          {row.calculation.quantitySold ?? 0}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <span className="text-slate-700">{row.productInfo.type}</span>
      ),
    },
    {
      key: "roi",
      header: "ROI Average",
      cell: (row) => (
        <span className="text-slate-700">
          {row.productInfo.type === "Supply"
            ? "—"
            : `${row.calculation.ReturnAndInvestment}%`}
        </span>
      ),
    },
    {
      key: "date",
      header: "Purchase Date",
      cell: (row) => (
        <span className="text-slate-700">
          {row.date ? FormatUtcToTimezone(row.date, timezone, "MM/DD/YY") : ""}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={visible}
      rowKey={(r) => r.id}
      pagination={{
        currentPage,
        pageSize,
        totalItems: allRows.length,
        onChange: handlePageChange,
        itemLabel: "purchases",
      }}
      renderMobileCard={(row) => {
        const isSupply = row.productInfo.type === "Supply";
        return (
          <MobileCard>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={productLink(row)}
                  className="block text-base font-bold text-slate-8600 hover:text-[#6571FF]"
                >
                  {row.productInfo.name}
                </Link>
                <p className="mt-0.5 font-mono text-[12px] text-slate-400">
                  #{row.displayIndex}
                </p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-[#6571FF]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[#6571FF]/85">
                {row.productInfo.type}
              </span>
            </div>

            {/* Stats tiles */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <StatTile
                label="Avg Cost"
                value={formatCurrency(row.calculation.averageCost)}
              />
              <StatTile
                label="Avg Sales"
                value={
                  isSupply ? "—" : formatCurrency(row.calculation.averageSales)
                }
              />
              <StatTile
                label="Stock"
                value={Number(row.productInfo.quantity) ?? 0}
              />
              <StatTile label="Qty Sold" value={row.calculation.quantitySold} />
              <StatTile
                fullWidth
                emphasized={!isSupply}
                label="ROI"
                value={
                  isSupply ? "—" : `${row.calculation.ReturnAndInvestment}%`
                }
              />
            </div>
          </MobileCard>
        );
      }}
    />
  );
}

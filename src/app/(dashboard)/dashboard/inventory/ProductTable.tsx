"use client";

import { deleteInventory } from "@/actions/inventory/delete";
import InventoryResponsiveCard from "@/components/mobile-responsive/inventory/ResponsiveInventoryCard";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { ProductCardProps } from "@/types/inventory";
import { Category, InventoryProduct, User, Vendor } from "@prisma/client";
import { Pagination, Popconfirm } from "antd"; // Importing the Pagination component from Ant Design
import { ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import EditProduct from "./EditProduct";

type Density = "compact" | "cozy" | "comfy";

function StockBar({ qty, alert }: { qty: number; alert: number }) {
  const maxRef = Math.max(qty, (alert || 1) * 10, 50);
  const pct = qty === 0 ? 0 : Math.min((qty / maxRef) * 100, 100);
  const color =
    qty === 0 ? "#EF4444" : qty <= (alert || 0) ? "#F59E0B" : "#6571FF";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full opacity-60"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
        {qty}
      </span>
    </div>
  );
}

function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3)
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function Paginator({
  current,
  pageSize,
  total,
  onChange,
}: {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, size?: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = getPageRange(current, totalPages);
  const btn =
    "flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#6571FF] hover:text-[#6571FF] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600 dark:border-slate-700 dark:text-slate-300";
  return (
    <div className="flex items-center gap-1">
      <button
        className={btn}
        onClick={() => onChange(current - 1)}
        disabled={current <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e-${i}`} className="px-1 text-xs text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors",
              p === current
                ? "bg-[#6571FF] text-white shadow-sm shadow-[#6571FF]/30"
                : "border border-slate-200 text-slate-600 hover:border-[#6571FF] hover:text-[#6571FF] dark:border-slate-700 dark:text-slate-300",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        className={btn}
        onClick={() => onChange(current + 1)}
        disabled={current >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight size={14} />
      </button>
      <select
        value={pageSize}
        onChange={(e) => onChange(1, Number(e.target.value))}
        className="ml-2 h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#6571FF] focus:outline-none focus:ring-1 focus:ring-[#6571FF] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        {[10, 25, 50, 100].map((n) => (
          <option key={n} value={n}>
            {n} / page
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusBadge({ qty, alert }: { qty: number; alert: number }) {
  if (qty === 0)
    return (
      <span className="inline-flex min-w-20 justify-center items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[12px] font-semibold text-red-500 dark:bg-red-950/40">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Out
      </span>
    );
  if (qty <= (alert || 0))
    return (
      <span className="inline-flex min-w-20 justify-center items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-500 dark:bg-amber-950/40">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Low
      </span>
    );
  return (
    <span className="inline-flex min-w-20 justify-center items-center gap-1 rounded-full bg-[#6571FF]/5 px-2 py-0.5 text-[12px] font-semibold text-[#6571FF]/80 dark:bg-[#6571FF]/40">
      <span className="h-1.5 w-1.5 rounded-full bg-[#6571FF]/80" />
      In stock
    </span>
  );
}

export default function ProductTable({
  currentProductId,
  products,
  searchParams,
  totalItems,
  user,
  density = "comfy",
}: {
  currentProductId: number | undefined;
  products: (InventoryProduct & {
    category: Category;
    vendor: Vendor;
    User?: User;
    totalProducts: number;
  })[];
  searchParams: { page: string; limit: string };
  totalItems: number;
  user: User;
  density?: Density;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const pathname = usePathname();
  const viewTab = search?.get("view");
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.page) || 1,
  );
  const [pageSize, setPageSize] = useState(Number(searchParams.limit) || 50);

  const rowPy =
    density === "compact" ? "py-1" : density === "comfy" ? "py-3.5" : "py-2.5";

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
    const params = new URLSearchParams(search);
    params.set("page", page.toString());
    if (size) params.set("limit", size.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const itemLabel = viewTab === "products" ? "product" : "supply";

  const handleDelete = async (productId: number) => {
    const toastId = `delete-inventory-${productId}`;
    const res = await deleteInventory(productId);
    if (res?.type === "success") {
      toast.success(
        `${itemLabel[0].toUpperCase() + itemLabel.slice(1)} deleted`,
        {
          id: toastId,
        },
      );
    } else {
      toast.error(`Failed to delete ${itemLabel}`, {
        id: toastId,
      });
    }
    router.push(`/dashboard/inventory?view=${search?.get("view")}`);
  };

  return (
    <>
      {/* Mobile card list */}
      <div className="mt-0 space-y-2 md:hidden">
        {products.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            No {viewTab === "products" ? "products" : "supplies"} found
          </p>
        ) : (
          products.map((product, index) => (
            <InventoryResponsiveCard
              key={index}
              user={user}
              viewTab={viewTab!}
              search={search!}
              product={
                {
                  ...product,
                  price: product.price?.toString(),
                } as ProductCardProps
              }
              index={index}
            />
          ))
        )}
        <div className="h-20" />
      </div>

      {/* Desktop table */}
      <div className="thin-scrollbar hidden md:block h-[calc(75vh-110px)] overflow-auto overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-white dark:bg-slate-950">
            <tr className="border-b border-slate-100 dark:border-slate-800 text-sm capitalize tracking-wide text-slate-500">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Stock</th>
              <th className="px-3 py-2 text-left">Unit</th>
              <th className="px-3 py-2 text-left">Unit Price</th>
              <th className="px-3 py-2 text-left">Status</th>
              {(user?.employeeType === "Admin" ||
                user?.employeeType === "Manager") && (
                <th className="w-16 px-3 py-2">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    user?.employeeType === "Admin" ||
                    user?.employeeType === "Manager"
                      ? 6
                      : 5
                  }
                  className="text-center p-20"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Search size={20} /> No{" "}
                    {viewTab === "products" ? "products" : "supplies"} found{" "}
                    {search?.get("search") && (
                      <span>
                        for <mark>{search?.get("search")}</mark>
                      </span>
                    )}
                  </span>
                </td>
              </tr>
            ) : (
              products.map((product, idx) => {
                const params = new URLSearchParams(search);
                params.set("productId", product.id.toString());
                const qty = Number(product.quantity);
                const alert = Number(product.lowInventoryAlert) || 0;
                const isSelected = currentProductId === product.id;
                return (
                  <tr
                    key={product.id}
                    onClick={() =>
                      router.push(`${pathname}?${params.toString()}`)
                    }
                    className={cn(
                      "group cursor-pointer rounded-md transition-colors dark:border-slate-800/50",
                      isSelected
                        ? "bg-[#6571FF]/5 ring-1 ring-inset ring-[#6571FF]/20"
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-900/40",
                    )}
                  >
                    <td className={cn("px-3", rowPy)}>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isSelected
                            ? "text-[#6571FF]"
                            : "text-slate-500 hover:text-[#6571FF]",
                        )}
                      >
                        {`#${idx + 1 + (currentPage - 1) * pageSize}`}
                      </span>
                    </td>
                    <td className={cn("px-3", rowPy)}>
                      <div className="flex items-center gap-2">
                        <span className="max-w-[150px] truncate font-medium text-slate-600 dark:text-slate-200">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className={cn("px-3 text-sm text-slate-500", rowPy)}>
                      {product.category?.name || "—"}
                    </td>
                    <td className={cn("px-3", rowPy)}>
                      <StockBar qty={qty} alert={alert} />
                    </td>
                    <td className={cn("px-3 text-sm text-slate-500", rowPy)}>
                      {product.unit || "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 text-sm font-medium text-slate-500 dark:text-slate-200",
                        rowPy,
                      )}
                    >
                      {formatCurrency(
                        parseFloat(product.price?.toString() || "0"),
                      )}
                    </td>
                    <td className={cn("px-3", rowPy)}>
                      <StatusBadge qty={qty} alert={alert} />
                    </td>
                    {(user?.employeeType === "Admin" ||
                      user?.employeeType === "Manager") && (
                      <td
                        className={cn("px-3", rowPy)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <EditProduct productData={product} />
                          <Popconfirm
                            title={`Delete this ${viewTab === "products" ? "product" : "supply"}?`}
                            onConfirm={() => handleDelete(product.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <button className="rounded p-1 mb-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors dark:hover:bg-red-950/40">
                              <Trash2 size={18} className="text-red-400" />
                            </button>
                          </Popconfirm>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="hidden items-center justify-between border-t border-slate-100 px-3 py-2.5 dark:border-slate-800 md:flex">
        <span className="text-[11px] text-slate-400">
          Showing{" "}
          {totalItems === 0
            ? 0
            : Math.min((currentPage - 1) * pageSize + 1, totalItems)}
          –{Math.min(currentPage * pageSize, totalItems)} of {totalItems}{" "}
          {viewTab === "products" ? "products" : "supplies"}
        </span>
        {totalItems > pageSize && (
          <Paginator
            current={currentPage}
            pageSize={pageSize}
            total={totalItems}
            onChange={handlePageChange}
          />
        )}
      </div>
    </>
  );
}

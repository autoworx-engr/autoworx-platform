"use client";

import { deleteInventory } from "@/actions/inventory/delete";
import InventoryResponsiveCard from "@/components/mobile-responsive/inventory/ResponsiveInventoryCard";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { ProductCardProps } from "@/types/inventory";
import { Category, InventoryProduct, User, Vendor } from "@prisma/client";
import { Pagination, Popconfirm, Tooltip } from "antd"; // Importing the Pagination component from Ant Design
import { Search, X } from "lucide-react";
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
              products.map((product, index) => {
                const params = new URLSearchParams(search);
                params.set("productId", product.id.toString());
                return (
                  <tr
                    key={product.id}
                    className={cn(
                      "h-full cursor-pointer rounded-md py-3",
                      index % 2 === 0 ? evenColor : oddColor,
                      currentProductId === product.id &&
                      "border-2 border-[#6571FF]",
                    )}
                    onClick={() =>
                      router.push(`${pathname}?${params.toString()}`)
                    }
                  >
                    <td className="h-12 px-4 text-left">
                      <p>{(currentPage - 1) * pageSize + index + 1}</p>
                    </td>
                    <td className="max-w-36 px-4 text-left">
                      <div className="flex items-center gap-2 ">
                        {Number(product.quantity) === 0 ? (
                          <Tooltip
                            title="Product is out of stock"
                            placement="top"
                          >
                            <span className="text-red-600 cursor-default">
                              {product.name.length > 20
                                ? product.name.slice(0, 20) + "..."
                                : product.name}
                            </span>
                            {product.name.length > 20 && (
                              <span className="sr-only">{product.name}</span>
                            )}
                          </Tooltip>
                        ) : Number(product.quantity) <=
                          Number(product.lowInventoryAlert) ? (
                          <Tooltip
                            title="Product has low inventory"
                            placement="top"
                          >
                            <span className="text-amber-600 cursor-default">
                              {product.name.length > 20
                                ? product.name.slice(0, 20) + "..."
                                : product.name}
                            </span>
                            {product.name.length > 20 && (
                              <span className="sr-only">{product.name}</span>
                            )}
                          </Tooltip>
                        ) : (
                          <Tooltip
                            title={product.name.length > 20 ? product.name : ""}
                            placement="top"
                          >
                            <span className="cursor-default">
                              {product.name.length > 20
                                ? product.name.slice(0, 20) + "..."
                                : product.name}
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="max-w-36 px-4 text-left truncate">
                      {product.category?.name ? (
                        <Tooltip
                          title={
                            product.category.name.length > 20
                              ? product.category.name
                              : undefined
                          }
                          placement="top"
                        >
                          <span className="cursor-default">
                            {product.category.name.length > 20
                              ? product.category.name.slice(0, 20) + "..."
                              : product.category.name}
                          </span>
                        </Tooltip>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="px-4 text-left 2xl:px-10 truncate">
                      <Tooltip
                        title={
                          String(product.quantity).length > 10
                            ? String(product.quantity)
                            : undefined
                        }
                        placement="top"
                      >
                        <span className="cursor-default">
                          {Number(product.quantity)}
                        </span>
                      </Tooltip>
                    </td>

                    <td className="px-4 text-left 2xl:px-10 truncate">
                      {product.unit ? (
                        <Tooltip
                          title={
                            product.unit.length > 5 ? product.unit : undefined
                          }
                          placement="top"
                        >
                          <span className="cursor-default">
                            {product.unit.length > 5
                              ? product.unit.slice(0, 5) + "..."
                              : product.unit}
                          </span>
                        </Tooltip>
                      ) : (
                        "-"
                      )}
                    </td>

                    {(user?.employeeType === "Admin" ||
                      user?.employeeType === "Manager") && (
                        <td>
                          <div className="flex h-12 items-center justify-start gap-3 px-4 2xl:px-10">
                            <button className="text-2xl text-blue-600">
                              <EditProduct productData={product} />
                            </button>
                            <Popconfirm
                              title={`Are you sure you want to delete this ${itemLabel}?`}
                              onConfirm={() => handleDelete(product.id)}
                              okText="Yes"
                              cancelText="No"
                            >
                              <X
                                size={20}
                                strokeWidth={3}
                                className="text-red-400"
                              />
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

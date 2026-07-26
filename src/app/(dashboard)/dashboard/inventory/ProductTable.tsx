"use client";

import { deleteInventory } from "@/actions/inventory/delete";
import InventoryResponsiveCard from "@/components/mobile-responsive/inventory/ResponsiveInventoryCard";
import { cn } from "@/lib/cn";
import { ProductCardProps } from "@/types/inventory";
import { Category, InventoryProduct, User, Vendor } from "@prisma/client";
import { Pagination, Popconfirm, Tooltip } from "antd"; // Importing the Pagination component from Ant Design
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import EditProduct from "./EditProduct";

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

export default function ProductTable({
  currentProductId,
  products,
  searchParams,
  totalItems,
  user,
}: {
  currentProductId: number | undefined;
  products: (InventoryProduct & {
    category: Category;
    vendor: Vendor;
    User?: User;
    totalProducts: number;
  })[];
  searchParams: {
    page: string;
    limit: string;
  };
  totalItems: number;
  user: User;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const pathname = usePathname();
  const viewTab = search?.get("view");
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.page) || 1,
  );
  const [pageSize, setPageSize] = useState(Number(searchParams.limit) || 50);
  const [showPagination, setShowPagination] = useState(false);

  useEffect(() => {
    if (totalItems > 10) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [totalItems]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
    const params = new URLSearchParams(search);
    params.set("page", page.toString());
    if (pageSize) {
      params.set("limit", pageSize.toString());
    }
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
      {/* card list  */}
      <div className="mt-4 space-y-2 lg:hidden ">
        {products.length === 0 ? (
          <div className="py-8">
            <InventoryEmptyState
              viewTab={viewTab}
              search={search?.get("search")}
            />
          </div>
        ) : (
          products.map((product, index) => {
            return (
              <div key={product.id}>
                <InventoryResponsiveCard
                  user={user}
                  viewTab={viewTab ?? null}
                  search={search ?? new URLSearchParams()}
                  product={
                    {
                      ...product,
                      price: product.price?.toString(),
                    } as ProductCardProps
                  }
                  index={index}
                />
              </div>
            );
          })
        )}

        {/* Mobile Pagination */}
        {showPagination && (
          <div className="mt-4 flex justify-center">
            <Pagination
              className="custom-pagination"
              current={currentPage}
              pageSize={pageSize}
              total={totalItems}
              onChange={handlePageChange}
              showSizeChanger
              onShowSizeChange={handlePageChange}
              simple
            />
          </div>
        )}

        {/* Extra bottom padding to prevent overlap */}
        <div className="h-20 lg:hidden" />
      </div>

      <div className="thin-scrollbar hidden lg:block pb-4 h-[calc(70vh-78px)] overflow-auto overflow-x-clip">
        <table className="w-full">
          <thead className="bg-background sticky top-0 ">
            <tr className="h-10 border-b">
              <th className="px-4 text-left">#</th>
              <th className="px-4 text-left">Name</th>
              <th className="px-4 text-left">Category</th>
              <th className="px-4 text-left 2xl:px-10">Quantity</th>
              <th className="px-4 text-left 2xl:px-10">Unit</th>
              {(user?.employeeType === "Admin" ||
                user?.employeeType === "Manager") && (
                <th className="px-4 text-left 2xl:px-10">Action</th>
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
                >
                  <InventoryEmptyState
                    viewTab={viewTab}
                    search={search?.get("search")}
                  />
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
                        "border-2 border-primary",
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
      {showPagination && (
        <div className="mt-4 hidden items-center justify-end lg:flex">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={totalItems}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        </div>
      )}
    </>
  );
}

function InventoryEmptyState({
  viewTab,
  search,
}: {
  viewTab: string | null;
  search?: string | null;
}) {
  const itemType = viewTab === "products" ? "products" : "supplies";
  return (
    <div className="flex min-h-[55vh] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/50">
        <Search size={24} className="text-slate-300" strokeWidth={1.5} />
        <div className="absolute inset-0 animate-ping rounded-3xl bg-slate-100 opacity-20" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-slate-500">
        No Results Found
      </h3>
      <p className="max-w-[280px] text-sm font-medium leading-relaxed text-slate-400">
        We couldn&apos;t find any {itemType}{" "}
        {search ? <span>for &quot;{search}&quot;</span> : ""}. Try adjusting
        your filters or search terms.
      </p>
    </div>
  );
}

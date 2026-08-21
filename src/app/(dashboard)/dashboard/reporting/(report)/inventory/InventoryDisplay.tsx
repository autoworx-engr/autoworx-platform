"use client";
import {
  InventoryProduct,
  InventoryProductHistory,
  Prisma,
} from "@prisma/client";
import { Pagination } from "antd";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import InventoryMobileCard from "./InventoryMobileCard";
import InventoryTableRow from "./InventoryTableRow";

type TProps = {
  inventoryProducts: Prisma.InventoryProductGetPayload<{
    include: {
      InventoryProductHistory: {
        where: {
          type: "Sale";
        };
      };
    };
  }>[];

  timezone: string;
  page?: number;
  take?: number;
};

type TInventoryPurchaseHistory = (InventoryProductHistory & {
  calculation: {
    averageCost: number;
    averageSales: number;
    ReturnAndInvestment: string;
    quantitySold: number;
    stockQuantity: number;
  };
  productInfo: InventoryProduct;
  date: Date | null;
})[];

export default function InventoryDisplay({
  inventoryProducts,
  timezone,
  page,
  take,
}: TProps) {
  const isDesktop = useMediaQuery({ query: "(min-width: 640px)" });
  const [currentPage, setCurrentPage] = useState(page || 1);
  const [pageSize, setPageSize] = useState(take || 50); // Default page size set to 50
  const [showPagination, setShowPagination] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState(inventoryProducts);

  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const search = params.get("search");

  // Sync state with URL params when they change
  useEffect(() => {
    setCurrentPage(page || 1);
    setPageSize(take || 50);
  }, [page, take]);

  useEffect(() => {
    if (inventoryProducts.length > 0) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [inventoryProducts]);

  const inventoryHistory = inventoryProducts.reduce((acc, product) => {
    const salesHistory = product.InventoryProductHistory.filter((history) => {
      return history.type === "Sale";
    });
    const purchaseHistory = product.InventoryProductHistory.filter(
      (history) => {
        return history.type === "Purchase";
      },
    );
    const stockQuantity = product.quantity ?? 0;
    const { totalSalesPrice, quantitySold } = salesHistory.reduce(
      (acc, cur) => {
        acc.totalSalesPrice =
          acc.totalSalesPrice + Number(cur.price) * Number(cur.quantity);
        acc.quantitySold += Number(cur.quantity);
        return acc;
      },
      {
        totalSalesPrice: 0,
        quantitySold: 0,
      },
    );

    const averageSales = Math.round(
      totalSalesPrice / (quantitySold || 1),
    ) as number;

    const totalPurchaseQuantity = purchaseHistory.reduce(
      (acc, history) => acc + Number(history.quantity),
      0,
    );

    const totalPurchasePrice = purchaseHistory.reduce(
      (acc, history) => acc + Number(history.price) * Number(history.quantity),
      0,
    );

    const averageCost =
      totalPurchaseQuantity > 0
        ? totalPurchasePrice / totalPurchaseQuantity
        : 0;

    const ReturnAndInvestment =
      averageSales > averageCost
        ? (((averageSales - averageCost) / averageCost) * 100).toFixed(2)
        : "0.00";
    const { InventoryProductHistory, ...productInfo } = product;
    acc.push(
      ...purchaseHistory.map((purchase) => ({
        ...purchase,
        calculation: {
          averageCost,
          averageSales,
          ReturnAndInvestment,
          quantitySold: Number(quantitySold),
          stockQuantity: Number(stockQuantity),
        },
        productInfo: productInfo,
      })),
    );
    return acc;
  }, [] as TInventoryPurchaseHistory);

  // Sort the final inventory history by date in descending order
  const sortedInventoryHistory = inventoryHistory.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  const handlePageChange = (page: number, pageSize?: number) => {
    const searchParams = new URLSearchParams(params.toString());
    searchParams.set("page", page.toString());
    if (pageSize) {
      setPageSize(pageSize);
      searchParams.set("take", pageSize.toString());
    } else {
      searchParams.delete("take");
    }
    setCurrentPage(page);
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.push(newPath);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = currentPage * pageSize;

  const inventoryToRender = search
    ? sortedInventoryHistory
    : sortedInventoryHistory.slice(startIndex, endIndex);
  if (isDesktop) {
    return (
      <div className="hidden scroll-smooth md:block pt-2">
        <div className="relative flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
          <div className="max-h-[60vh] overflow-auto custom-scrollbar">
            {inventoryToRender.length === 0 ? (
              <div className="flex min-h-[200px] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
                {/* Ghost Icon Illustration */}
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/50">
                  <Search
                    size={24}
                    className="text-slate-300"
                    strokeWidth={1.5}
                  />
                  {/* Decorative ripple effect */}
                  <div className="absolute inset-0 animate-ping rounded-3xl bg-slate-100 opacity-20" />
                </div>

                {/* Text Content */}
                <h3 className="mb-2 text-lg font-bold text-slate-500">
                  No Results Found
                </h3>
                <p className="max-w-[280px] text-sm font-medium leading-relaxed text-slate-400">
                  We couldn't find what you're looking for. Try adjusting your
                  filters or search terms.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[980px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="h-10 border-b">
                    <th className="px-4 py-2 text-left">Product #</th>
                    <th className="px-4 py-2 text-left">Name </th>
                    <th className="px-4 py-2 text-left">Average Cost</th>
                    <th className="px-4 py-2 text-left">Average Sell</th>
                    <th className="px-4 py-2 text-left">Stock Qty.</th>
                    <th className="px-4 py-2 text-left">Qty. Sold</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">ROI Average</th>
                    <th className="px-4 py-2 text-left">Purchase Date</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryToRender?.map((history, index) => (
                    <InventoryTableRow
                      key={history.id}
                      history={history}
                      index={
                        currentPage > 1
                          ? index + pageSize * (currentPage - 1)
                          : index
                      }
                      timezone={timezone}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {showPagination && (
            <div className="mt-auto flex shrink-0 justify-end bg-white px-4 py-2 shadow-[0_-1px_2px_rgba(0,0,0,0.04)]">
              <Pagination
                className="custom-pagination"
                current={currentPage}
                pageSize={pageSize}
                total={sortedInventoryHistory.length}
                onChange={handlePageChange}
                showSizeChanger
                onShowSizeChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4 md:hidden">
        {inventoryToRender.map((history, index) => (
          <InventoryMobileCard
            key={history.id}
            history={history}
            index={
              currentPage > 1 ? index + pageSize * (currentPage - 1) : index
            }
            // timezone={timezone}
          />
        ))}
      </div>

      {/* Mobile Pagination */}
      {showPagination && (
        <div className="mt-4 flex justify-center pb-4">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={sortedInventoryHistory.length}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

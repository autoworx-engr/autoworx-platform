"use client";
import { Refund } from "@prisma/client";
import { Pagination } from "antd";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { TInvoice } from "./page";
import RevenueMobileCard from "./RevenueMobileCard";
import RevenueTableRow from "./RevenueTableRow";

type TProps = {
  filteredInvoice: (TInvoice & {
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
  })[];
  total: number;
  timezone: string | Date;
  page?: number;
  take?: number;
};

export default function RevenueDisplay({
  filteredInvoice,
  total,
  timezone,
  page,
  take,
}: TProps) {
  const isDesktop = useMediaQuery({ query: "(min-width: 640px)" });
  const [currentPage, setCurrentPage] = useState(page || 1);
  const [pageSize, setPageSize] = useState(take || 50);
  const [showPagination, setShowPagination] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    setCurrentPage(page || 1);
    setPageSize(take || 50);
  }, [page, take]);

  useEffect(() => {
    if (total > 0) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [total]);

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
  // filteredInvoice is already server-paginated
  const invoicesToRender = filteredInvoice;

  if (isDesktop) {
    return (
      <div className="w-full pt-2">
        <div className="relative flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
          <div className="max-h-[60vh] overflow-auto custom-scrollbar">
            {invoicesToRender.length === 0 ? (
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
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-left">Vehicle Info</th>
                    <th className="px-4 py-2 text-left">Invoice #</th>
                    <th className="px-4 py-2 text-left">Date Delivered</th>
                    <th className="px-4 py-2 text-left">Price</th>
                    <th className="px-4 py-2 text-left">Cost</th>
                    <th className="px-4 py-2 text-left">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesToRender?.map((invoice, index) => {
                    // Generate loss details for tooltip
                    const lossDetails = [];

                    // Inventory losses (lost products)
                    if (invoice.inventoryLossAmount > 0) {
                      const inventoryMaterialNames =
                        invoice.InventoryProductHistory?.map(
                          (item) => item.product?.name,
                        ).filter(Boolean);
                      lossDetails.push(
                        `Inventory Loss: ${inventoryMaterialNames?.join(", ")}`,
                      );
                    }

                    // Material losses (show actual material names with losses)
                    if (
                      invoice.materialLossAmount > 0 &&
                      invoice.materialLossDetails?.length > 0
                    ) {
                      const materialNames = invoice.materialLossDetails.map(
                        (detail) =>
                          `${detail.name} ($${detail.loss.toFixed(2)})`,
                      );
                      lossDetails.push(
                        `Material Loss: ${materialNames.join(", ")}`,
                      );
                    }

                    // Labor losses
                    if (invoice.laborLossAmount > 0) {
                      lossDetails.push(
                        `Labor Loss: Technician cost exceeds charges ($${invoice.laborLossAmount.toFixed(2)})`,
                      );
                    }

                    return (
                      <RevenueTableRow
                        key={invoice.id}
                        invoice={invoice}
                        timezone={timezone as string}
                        index={index}
                        totalLossAmount={invoice.totalLossAmount}
                        lossDetails={lossDetails}
                      />
                    );
                  })}
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
                total={total}
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
      <div className="space-y-4">
        {invoicesToRender.map((invoice, index) => (
          <RevenueMobileCard
            key={invoice.id}
            invoice={invoice}
            index={index}
            timezone={timezone as string}
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
            total={total}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
            simple
          />
        </div>
      )}
    </div>
  );
}

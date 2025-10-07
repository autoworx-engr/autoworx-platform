"use client";
import { useMediaQuery } from "react-responsive";
import { TInvoice } from "./page";
import RevenueTableRow from "./RevenueTableRow";
import RevenueMobileCard from "./RevenueMobileCard";
import { InventoryProductHistory, Refund } from "@prisma/client";
import { Pagination } from "antd";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  timezone: string | Date;
  page?: number;
  take?: number;
};

export default function RevenueDisplay({
  filteredInvoice,
  timezone,
  page,
  take,
}: TProps) {
  const isDesktop = useMediaQuery({ query: "(min-width: 640px)" });
  const [currentPage, setCurrentPage] = useState(page || 1);
  const [pageSize, setPageSize] = useState(take || 50);
  const [showPagination, setShowPagination] = useState(false);
  const [filteredInvoices, setFilteredInvoices] = useState(filteredInvoice);

  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const search = params.get("search");

  useEffect(() => {
    if (filteredInvoice.length > 0) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [filteredInvoice]);

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
  const invoicesToRender = search
    ? filteredInvoice
    : filteredInvoice.slice(startIndex, endIndex);

  if (isDesktop) {
    return (
      <div className="w-full">
        <table className="w-full shadow-md">
          <thead className="bg-background">
            <tr className="h-10 border-b">
              <th className="border-b px-4 py-2 text-left">Customer</th>
              <th className="border-b px-4 py-2 text-left">Vehicle Info </th>
              <th className="border-b px-4 py-2 text-left">Invoice #</th>
              <th className="border-b px-4 py-2 text-left">Date Delivered</th>
              <th className="border-b px-4 py-2 text-left">Price</th>
              <th className="border-b px-4 py-2 text-left">Cost</th>
              <th className="border-b px-4 py-2 text-left">Profit</th>
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
                    (item) => item.product?.name
                  ).filter(Boolean);
                lossDetails.push(
                  `Inventory Loss: ${inventoryMaterialNames?.join(", ")}`
                );
              }

              // Material losses (show actual material names with losses)
              if (
                invoice.materialLossAmount > 0 &&
                invoice.materialLossDetails?.length > 0
              ) {
                const materialNames = invoice.materialLossDetails.map(
                  (detail) => `${detail.name} ($${detail.loss.toFixed(2)})`
                );
                lossDetails.push(`Material Loss: ${materialNames.join(", ")}`);
              }

              // Labor losses
              if (invoice.laborLossAmount > 0) {
                lossDetails.push(
                  `Labor Loss: Technician cost exceeds charges ($${invoice.laborLossAmount.toFixed(2)})`
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
        {showPagination && (
          <div className="mt-4 flex justify-end">
            <Pagination
              className="custom-pagination"
              current={currentPage}
              pageSize={pageSize}
              total={filteredInvoices?.length}
              onChange={handlePageChange}
              showSizeChanger
              onShowSizeChange={handlePageChange}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredInvoice.map((invoice, index) => (
        <RevenueMobileCard
          key={invoice.id}
          invoice={invoice}
          index={index}
          timezone={timezone as string}
        />
      ))}
    </div>
  );
}

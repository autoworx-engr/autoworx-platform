"use client";
import { useMediaQuery } from "react-responsive";
import { TInvoice } from "./page";
import RevenueTableRow from "./RevenueTableRow";
import RevenueMobileCard from "./RevenueMobileCard";
import { InventoryProductHistory } from "@prisma/client";
import { Pagination } from "antd";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type TProps = {
  filteredInvoice: (TInvoice & {
    costPrice: number;
    profitPrice: number;
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

  const calculateTotalLostCost = (
    inventoryHistory: InventoryProductHistory[]
  ) => {
    return inventoryHistory.reduce(
      (total, item) => total + Number(item.price) * Number(item.quantity),
      0
    );
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
              const inventoryLostTotalCost = calculateTotalLostCost(
                invoice?.InventoryProductHistory || []
              );

              const inventoryMaterialName =
                invoice.InventoryProductHistory?.map(
                  (item) => item.product?.name
                );
              return (
                <RevenueTableRow
                  key={invoice.id}
                  invoice={invoice}
                  timezone={timezone as string}
                  index={index}
                  inventoryLostTotalCost={inventoryLostTotalCost}
                  inventoryMaterialName={inventoryMaterialName}
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

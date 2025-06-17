"use client";
import { useMediaQuery } from "react-responsive";
import { TInvoice } from "./page";
import RevenueTableRow from "./RevenueTableRow";
import RevenueMobileCard from "./RevenueMobileCard";
import { InventoryProductHistory } from "@prisma/client";

type TProps = {
  filteredInvoice: (TInvoice & {
    costPrice: number;
    profitPrice: number;
  })[];
  timezone: string | Date;
};

export default function RevenueDisplay({ filteredInvoice, timezone }: TProps) {
  const isDesktop = useMediaQuery({ query: "(min-width: 640px)" });
  const calculateTotalLostCost = (
    inventoryHistory: InventoryProductHistory[],
  ) => {
    return inventoryHistory.reduce(
      (total, item) => total + Number(item.price) * Number(item.quantity),
      0,
    );
  };

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
            {filteredInvoice.map((invoice, index) => {
              const inventoryLostTotalCost = calculateTotalLostCost(
                invoice?.InventoryProductHistory || [],
              );

              const inventoryMaterialName =
                invoice.InventoryProductHistory?.map(
                  (item) => item.product?.name,
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

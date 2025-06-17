"use client";
import { useMediaQuery } from "react-responsive";
import {
  InventoryProduct,
  InventoryProductHistory,
  Prisma,
} from "@prisma/client";
import InventoryTableRow from "./InventoryTableRow";
import InventoryMobileCard from "./InventoryMobileCard";

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
}: TProps) {
  const isDesktop = useMediaQuery({ query: "(min-width: 640px)" });

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

    const averageCost = Math.round(totalPurchasePrice / totalPurchaseQuantity);

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

  if (isDesktop) {
    return (
      <div className="thin-scrollbar hidden h-[400px] overflow-y-auto scroll-smooth md:block">
        {" "}
        <div className="">
          <table className="w-full shadow-md">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="h-10 border-b">
                <th className="border-b px-4 py-2 text-left">Product #</th>
                <th className="border-b px-4 py-2 text-left">Name </th>
                <th className="border-b px-4 py-2 text-left">Average Cost</th>
                <th className="border-b px-4 py-2 text-left">Average Sell</th>
                <th className="border-b px-4 py-2 text-left">Stock Qty.</th>
                <th className="border-b px-4 py-2 text-left">Qty. Sold</th>
                <th className="border-b px-4 py-2 text-left">Type</th>
                <th className="border-b px-4 py-2 text-left">ROI Average</th>
                <th className="border-b px-4 py-2 text-left">Purchase Date</th>
              </tr>
            </thead>
            <tbody>
              {inventoryHistory.map((history, index) => (
                <InventoryTableRow
                  key={history.id}
                  history={history}
                  index={index}
                  timezone={timezone}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:hidden">
      {inventoryHistory.map((history, index) => (
        <InventoryMobileCard key={history.id} history={history} index={index} />
      ))}
    </div>
  );
}

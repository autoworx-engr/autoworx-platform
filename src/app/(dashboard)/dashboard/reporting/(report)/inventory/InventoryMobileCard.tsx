"use client";
import { formatCurrency } from "@/utils/formatCurrency";
import { InventoryProduct, InventoryProductHistory } from "@prisma/client";
import Link from "next/link";

type TProps = {
  history: TInventoryPurchaseHistory;
  index: number;
};

type TInventoryPurchaseHistory = InventoryProductHistory & {
  calculation: {
    averageCost: number;
    averageSales: number;
    ReturnAndInvestment: string;
    quantitySold: number;
    stockQuantity: number;
  };
  productInfo: InventoryProduct;
};

export default function InventoryMobileCard({ history, index }: TProps) {
  const { averageCost, averageSales, ReturnAndInvestment, quantitySold } =
    history.calculation || {};
  const { name, type, quantity } = history.productInfo || {};
  let redirectUrl = "";

  if (history.productInfo.type === "Product") {
    redirectUrl = `/dashboard/inventory?view=products&productId=${history.productInfo.id}`;
  } else if (history.productInfo.type === "Supply") {
    redirectUrl = `/dashboard/inventory?view=supplies&productId=${history.productInfo.id}`;
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 dark:ring-slate-700/50 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Link
          href={redirectUrl}
          className="shrink-0 font-semibold text-primary"
        >
          #{index + 1}
        </Link>

        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
          {type}
        </span>
      </div>

      <div className="mb-3 min-w-0">
        <Link
          href={redirectUrl}
          className="block truncate text-base font-semibold text-slate-700 hover:text-primary dark:text-white sm:text-lg"
        >
          {name}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Average Cost
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {formatCurrency(averageCost ?? 0)}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Average Sales
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {formatCurrency(averageSales ?? 0)}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Quantity
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {Number(quantity) ?? 0}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Quantity Sold
          </div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {quantitySold ?? 0}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2 dark:bg-primary/10">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          ROI
        </span>
        <span className="font-semibold text-primary">
          {ReturnAndInvestment ?? 0}%
        </span>
      </div>
    </div>
  );
}

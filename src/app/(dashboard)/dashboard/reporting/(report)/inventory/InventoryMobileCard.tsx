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
    <div
      className={`rounded-lg border p-4 shadow-md ${index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]"}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <Link href={redirectUrl} className="font-semibold text-primary">
          {index + 1}
        </Link>

        <span className="font-semibold">{type}</span>
      </div>

      <div className="mb-2">
        <Link
          href={redirectUrl}
          className="text-lg font-semibold text-[#66738C]"
        >
          {name}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t pt-2">
        <div>
          <div className="text-sm text-[#66738C]">Average Cost</div>
          <div className="font-semibold text-[#66738C]">
            {formatCurrency(averageCost ?? 0)}
          </div>
        </div>
        <div>
          <div className="text-sm text-[#66738C]">Average Sales</div>
          <div className="font-semibold text-[#66738C]">
            {formatCurrency(averageSales ?? 0)}
          </div>
        </div>
        <div>
          <div className="text-sm text-[#66738C]">Quantity</div>
          <div className="font-semibold text-[#66738C]">
            {Number(quantity) ?? 0}
          </div>
        </div>
        <div>
          <div className="text-sm text-[#66738C]">Quantity Sold</div>
          <div className="font-semibold text-[#66738C]">
            {quantitySold ?? 0}
          </div>
        </div>
        <div className="col-span-2">
          <div className="text-sm text-[#66738C]">ROI</div>
          <div className="font-semibold text-[#66738C]">
            {ReturnAndInvestment ?? 0}%
          </div>
        </div>
      </div>
    </div>
  );
}

import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";
import { InventoryProduct, InventoryProductHistory } from "@prisma/client";
import Link from "next/link";

type TProps = {
  history: TInventoryPurchaseHistory;
  index: number;
  timezone: string;
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
  date: Date | null;
};

export default function InventoryTableRow({
  history,
  index,
  timezone,
}: TProps) {
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
    <tr
      className={cn(
        "cursor-pointer py-3 duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50",
        index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]",
      )}
    >
      <td className="px-4 py-2 text-left">
        <Link className="text-blue-500" href={redirectUrl}>
          {index + 1}
        </Link>
      </td>
      <td className="px-4 py-2 text-left">{name}</td>
      <td className="px-4 py-2 text-left">
        {averageCost !== null && typeof averageCost === "number"
          ? formatCurrency(averageCost)
          : "-"}
      </td>
      <td className="px-4 py-2 text-left">
        {type === "Supply" ? "-" : formatCurrency(averageSales ?? 0)}
      </td>
      <td className="px-4 py-2 text-left">{Number(quantity) ?? 0}</td>
      <td className="px-4 py-2 text-left">{quantitySold ?? 0}</td>
      <td className="px-4 py-2 text-left">{type}</td>
      <td className="px-4 py-2 text-left">
        {type === "Supply" ? "-" : `${ReturnAndInvestment ?? 0}%`}
      </td>
      <td className="px-4 py-2 text-left">
        {history?.date &&
          FormatUtcToTimezone(history?.date, timezone, "MM/DD/YY")}
      </td>
    </tr>
  );
}

import { deleteInventory } from "@/actions/inventory/delete";
import EditProduct from "@/app/(dashboard)/dashboard/inventory/EditProduct";
import { cn } from "@/lib/cn";
import { ProductCardProps } from "@/types/inventory";
import { formatCurrency } from "@/utils/formatCurrency";
import { Category, InventoryProduct, Vendor } from "@prisma/client";
import { Popconfirm } from "antd";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface InventoryResponsiveCardProps {
  product: ProductCardProps;
  index: number;
  user: { employeeType?: "Admin" | "Manager" | string } | null;
  viewTab: string | null;
  search: URLSearchParams;
}

const SWATCH_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
];
function getSwatchColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SWATCH_COLORS[Math.abs(hash) % SWATCH_COLORS.length];
}

const InventoryResponsiveCard: React.FC<InventoryResponsiveCardProps> = ({
  product,
  user,
  viewTab,
  search,
}) => {
  const router = useRouter();
  const qty = Number(product?.quantity ?? 0);
  const alert = Number(product?.lowInventoryAlert ?? 0);
  const price = parseFloat(product?.price?.toString() || "0");
  const isOut = qty === 0;
  const isLow = !isOut && qty <= alert;
  const isAdmin =
    user?.employeeType === "Admin" || user?.employeeType === "Manager";
  const sku = product?.lot || `#${product?.id}`;

  const maxRef = Math.max(qty, (alert || 1) * 10, 50);
  const pct = qty === 0 ? 0 : Math.min((qty / maxRef) * 100, 100);
  const barColor = isOut ? "#EF4444" : isLow ? "#F59E0B" : "#6571FF";

  const goToDetails = () =>
    router.push(
      `/dashboard/inventory?view=${search?.get("view")}&productId=${product.id}`,
    );

  return (
    <div
      onClick={goToDetails}
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950"
    >
      {/* Top row: swatch + SKU/name + status */}
      <div className="flex items-start gap-3">
        <div
          className="h-12 w-12 flex-shrink-0 rounded-lg"
          style={{ backgroundColor: getSwatchColor(product.name) }}
        />
        <div className="min-w-0 flex-1 gap-1">
          {/* <p className="font-mono text-[11px] font-medium text-slate-400">{sku}</p> */}
          <h3 className="truncate text-base font-bold text-slate-500 dark:text-slate-100">
            {product.name}
          </h3>
          <span
            className={cn(
              "inline-flex flex-shrink-0 items-center gap-1 rounded-full mt-0.5 px-2.5 pt-0 pb-0.5 text-[11px] font-semibold",
              isOut
                ? "bg-red-50 text-red-600"
                : isLow
                  ? "bg-amber-50 text-amber-600"
                  : "bg-[#6571FF]/10 text-[#6571FF]",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-[#6571FF]",
              )}
            />
            {isOut ? "Out" : isLow ? "Low" : "In stock"}
          </span>
        </div>
      </div>

      {/* Middle row: category + unit price */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="truncate text-sm text-slate-500">
          {product.category?.name ?? "Uncategorized"}
        </span>
        <span className="flex-shrink-0 text-sm font-bold text-slate-500 dark:text-slate-100">
          {formatCurrency(price)}
          <span className="ml-1 text-xs font-medium text-slate-400">
            / {product.unit || "unit"}
          </span>
        </span>
      </div>

      {/* Bottom row: stock bar + reorder */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Stock
          </span>
          <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full transition-all opacity-60"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-200">
            {qty}
          </span>
        </div>
        {alert > 0 && (
          <span className="flex-shrink-0 text-[11px] text-slate-400">
            reorder at {alert} {product.unit || ""}
          </span>
        )}
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-2 dark:border-slate-800"
        >
          <EditProduct
            productData={
              product as unknown as InventoryProduct & {
                category: Category;
                vendor: Vendor;
              }
            }
          />
          <Popconfirm
            title={`Delete this ${viewTab === "products" ? "product" : "supply"}?`}
            onConfirm={async () => {
              await deleteInventory(product.id);
              router.push(`/dashboard/inventory?view=${search?.get("view")}`);
            }}
            okText="Yes"
            cancelText="No"
          >
            <button className="rounded p-1 mb-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors dark:hover:bg-red-950/40">
              <Trash2 size={18} className="text-red-400" />
            </button>
          </Popconfirm>
        </div>
      )}
    </div>
  );
};

export default InventoryResponsiveCard;

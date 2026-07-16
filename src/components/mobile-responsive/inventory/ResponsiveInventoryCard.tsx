import { deleteInventory } from "@/actions/inventory/delete";
import EditProduct from "@/app/(dashboard)/dashboard/inventory/EditProduct";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { ProductCardProps } from "@/types/inventory";
import { Popconfirm, Tooltip } from "antd";
import { CircleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface InventoryResponsiveCardProps {
  product: ProductCardProps;
  index: number;
  user: { employeeType?: "Admin" | "Manager" | string } | null;
  viewTab: string | null;
  search: URLSearchParams;
}

const InventoryResponsiveCard: React.FC<InventoryResponsiveCardProps> = ({
  product,
  index,
  user,
  viewTab,
  search,
}) => {
  const evenColor = "bg-background";
  const oddColor = "bg-[#EEF4FF]";
  const router = useRouter();

  const isOutOfStock = Number(product.quantity) === 0;
  const isLowStock =
    !isOutOfStock &&
    Number(product.quantity) <= Number(product.lowInventoryAlert);
  const canManage =
    user?.employeeType === "Admin" || user?.employeeType === "Manager";

  const goToProduct = () =>
    router.push(
      `/dashboard/inventory?view=${search?.get("view")}&productId=${product.id}`,
    );

  // Prevent the card's navigation when interacting with the action controls.
  const stopClick = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={goToProduct}
      onKeyDown={(event) => {
        // Only react when the card itself is focused, not a child control.
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToProduct();
        }
      }}
      className={cn(
        "group min-h-[110px] cursor-pointer rounded-lg border border-[#BFC4FF] px-4 py-3 shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary hover:shadow-md",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        (index + 1) % 2 === 0 ? evenColor : oddColor,
      )}
    >
      <div className="flex flex-col gap-3 text-[#66738C]">
        {/* Name + category */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {isOutOfStock ? (
              <Tooltip title="Product is out of stock" placement="top">
                <CircleAlert className="size-4 shrink-0 text-red-600" />
              </Tooltip>
            ) : isLowStock ? (
              <Tooltip title="Product has low inventory" placement="top">
                <CircleAlert className="size-4 shrink-0 text-yellow-600" />
              </Tooltip>
            ) : null}
            <h3 className="truncate text-lg font-bold text-slate-600 transition-colors group-hover:text-primary">
              {product.name}
            </h3>
          </div>
          <p className="truncate text-sm font-semibold text-primary">
            {product.category?.name ?? "Unknown Category"}
          </p>
        </div>

        {/* Remaining quantity */}
        <div className="flex items-end justify-between rounded-md border border-[#BFC4FF] bg-white/60 px-3 py-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[#8A93A6]">
            Remaining
          </span>
          <p className="font-bold leading-none text-slate-600">
            <span className="text-2xl">{product?.quantity}</span>
            <span className="text-[10px] font-medium text-[#8A93A6]">
              {" "}
              /{product?.unit}
            </span>
          </p>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex items-center gap-3" onClick={stopClick}>
            <span className="text-blue-600" title="Edit">
              <EditProduct productData={product as any} />
            </span>
            <Popconfirm
              title={`Are you sure you want to delete this ${
                viewTab === "products" ? "product" : "supply"
              }?`}
              onConfirm={async () => {
                await deleteInventory(product.id);
                router.push(`/dashboard/inventory?view=${search?.get("view")}`);
              }}
              okText="Yes"
              cancelText="No"
            >
              <button
                type="button"
                className="text-red-400 transition-colors hover:text-red-600"
                title="Delete"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </Popconfirm>
          </div>
        )}
      </div>
    </Card>
  );
};

export default InventoryResponsiveCard;

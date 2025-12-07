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

  return (
    <div>
      <Card
        className={cn(
          "mt min-h-[110px] rounded-[5px] border border-[#BFC4FF] px-4 py-2 shadow-sm",
          (index + 1) % 2 === 0 ? evenColor : oddColor
        )}
      >
        <div className="flex flex-col gap-2 text-[#66738C] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              {product.quantity === 0 ? (
                <Tooltip title="Product is out of stock" placement="top">
                  <CircleAlert className="size-4 text-xl text-red-600" />
                </Tooltip>
              ) : Number(product.quantity) <=
                Number(product.lowInventoryAlert) ? (
                <Tooltip title="Product has low inventory" placement="top">
                  <CircleAlert className="size-4 text-xl text-yellow-600" />
                </Tooltip>
              ) : null}
              <h3
                onClick={() =>
                  router.push(
                    `/dashboard/inventory?view=${search?.get("view")}&productId=${product.id}`
                  )
                }
                className="cursor-pointer truncate text-xl font-bold"
                style={{ maxWidth: "90%" }} // Prevents overflow
              >
                {product.name}
              </h3>
            </div>
            <p className="truncate text-sm font-bold text-[#6571FF]">
              {product.category?.name ?? "Unknown Category"}
            </p>
          </div>
          <div className="mt-1 h-[70px] rounded-[2px] border border-[#BFC4FF] px-2 py-1 text-right font-semibold sm:mt-0">
            <p className="text-3xl">
              {product?.quantity}
              <span className="text-[10px]"> /{product?.unit}</span>
            </p>
            <p className="text-[10px]">Remaining</p>
          </div>

          <div>
            {(user?.employeeType === "Admin" ||
              user?.employeeType === "Manager") && (
                <div className="mt-4 flex gap-2">
                  <button className="text-[18px] text-blue-600">
                    <EditProduct productData={product as any} />
                  </button>
                  <Popconfirm
                    title={`Are you sure you want to delete this ${viewTab === "products" ? "product" : "supply"
                      }?`}
                    onConfirm={async () => {
                      await deleteInventory(product.id);
                      router.push(
                        `/dashboard/inventory?view=${search?.get("view")}`
                      );
                    }}
                    okText="Yes"
                    cancelText="No"
                  >
                    <X
                      size={20}
                      strokeWidth={3}
                      className="text-xl text-red-400"
                    />
                  </Popconfirm>
                </div>
              )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InventoryResponsiveCard;

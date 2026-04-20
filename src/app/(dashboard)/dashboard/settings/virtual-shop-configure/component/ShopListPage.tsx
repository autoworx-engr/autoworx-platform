"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Store } from "lucide-react";
import CarLoading from "@/components/common/CarLoading";
import { useGetVirtualShops } from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import ShopCard from "./ShopCard";
import EmptyCard from "@/components/common/EmptyCard";
import { useRouter } from "next/navigation";

export default function ShopListPage({ companyId }: { companyId: number }) {
  const router = useRouter();
  const { data, isPending } = useGetVirtualShops(companyId);

  if (isPending) return <CarLoading />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your Shops</h1>
          <p className="text-sm text-gray-500">
            Manage all your virtual stores
          </p>
        </div>

        <Link href="/dashboard/settings/virtual-shop-configure/shops/create">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Configure New Shop
          </Button>
        </Link>
      </div>

      {/* Shop Grid */}
      {data?.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((shop: any) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : (
        <div className="p-6">
          <EmptyCard
            Icon={Store}
            title="No shop configure yet"
            description="Looks like you haven’t added any shop. Get started now."
            actionText="Configure New Shop"
            onAction={() =>
              router.push(
                "/dashboard/settings/virtual-shop-configure/shops/create",
              )
            }
          />
        </div>
      )}
    </div>
  );
}

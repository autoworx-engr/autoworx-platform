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
    <section className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
      {/* Header */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
              Your Shops
            </h1>
            <p className="max-w-md text-sm text-slate-500">
              Manage all your virtual stores
            </p>
          </div>

          <Link
            href="/dashboard/settings/virtual-shop-configure/shops/create"
            className="w-full sm:w-auto"
          >
            <Button className="flex w-full items-center justify-center gap-2 sm:w-auto bg-[#6571FF] hover:bg-[#6571FF]/90 focus-visible:bg-[#6571FF]/90">
              <Plus className="h-4 w-4" />
              Configure New Shop
            </Button>
          </Link>
        </div>
      </div>

      {/* Shop Grid */}
      {data?.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data?.map((shop: any) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
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
    </section>
  );
}

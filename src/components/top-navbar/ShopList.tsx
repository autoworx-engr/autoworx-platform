"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useGetVirtualShops } from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import {
  normalizeShops,
} from "./shopNavigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import Avatar from "../Avatar";

export default function ShopList() {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useGetCurrentUser();
  const companyId = Number(currentUser?.companyId ?? 0);

  const { data: shopsData = [] } = useGetVirtualShops(companyId, {
    enabled: currentUser?.employeeType === "Admin" && companyId > 0,
  });

  const reverseShopData = shopsData.reverse();

  const shops = useMemo(() => normalizeShops(reverseShopData), [reverseShopData]);
  const isVirtualShopAdminPath = pathname.startsWith("/dashboard/virtual-shop/admin/");

  const selectedShopId = useMemo(() => {
    const match = pathname.match(/\/dashboard\/virtual-shop\/admin\/(\d+)/);
    const routeShopId = match?.[1] ? Number.parseInt(match[1], 10) : Number.NaN;

    if (Number.isFinite(routeShopId)) {
      return routeShopId;
    }

    return shops[0]?.id ?? 0;
  }, [pathname, shops]);

  const selectedShop = shops.find((shop) => shop.id === selectedShopId) ?? shops[0];

  const handleShopClick = (shopId: number) => {
    router.push(`/dashboard/virtual-shop/admin/${shopId}/services`);
  };

  if (currentUser?.employeeType !== "Admin" || shops.length === 0) {
    return null;
  }

  return (
    <div className="mr-3 w-56">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`group flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium shadow-sm outline-none ring-offset-1 transition-all focus:ring-2 focus:ring-[#6571FF]/40 ${isVirtualShopAdminPath
            ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 data-[state=open]:border-[#6571FF] data-[state=open]:bg-slate-50/20 data-[state=open]:shadow-md"
            : "border-[#6571FF]/20 bg-[#6571FF]/5 text-[#6571FF] hover:bg-[#6571FF]/10 data-[state=open]:border-[#6571FF]/40 data-[state=open]:bg-[#6571FF]/15"
            }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {isVirtualShopAdminPath && selectedShop?.logoUrl ? (
              <Avatar
                photo={selectedShop.logoUrl}
                width={24}
                height={24}
                className="shrink-0 rounded-full border border-slate-100 shadow-sm"
                alt={selectedShop.storeName || "Shop"}
              />
            ) : isVirtualShopAdminPath ? (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                <span className="text-xs font-bold text-slate-500">
                  {selectedShop?.storeName?.charAt(0)?.toUpperCase() || "S"}
                </span>
              </div>
            ) : null}
            <span className="truncate">
              {isVirtualShopAdminPath
                ? selectedShop?.storeName ?? "Select Shop"
                : "View shop"}
            </span>
          </div>
          <ChevronDown
            size={16}
            className="shrink-0 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
          <DropdownMenuContent
            sideOffset={6}
            align="end"
            className="z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in-80 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:zoom-out-95"
          >
            <div className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Your Shops
            </div>
            <div className="mt-1 flex flex-col gap-1">
              {shops.map((shop) => {
                const isSelected = selectedShop?.id === shop.id;

                return (
                  <button
                    key={shop.id}
                    type="button"
                    onClick={() => handleShopClick(shop.id)}
                    className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition-all ${isSelected && isVirtualShopAdminPath
                      ? "bg-[#6571FF]/10 text-[#6571FF]"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-[#6571FF]/10"
                      }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {shop.logoUrl ? (
                        <Avatar
                          photo={shop.logoUrl}
                          width={24}
                          height={24}
                          className="shrink-0 rounded-full border border-slate-100 shadow-sm"
                          alt={shop.storeName}
                        />
                      ) : (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                          <span className="text-xs font-bold text-slate-500">
                            {shop.storeName?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="truncate">{shop.storeName}</span>
                    </div>

                    {isSelected && isVirtualShopAdminPath && (
                      <Check size={16} strokeWidth={2.5} className="shrink-0 text-[#6571FF]" />
                    )}
                  </button>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </div>
  );
}

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
import { ChevronDown } from "lucide-react";
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
    <div className="mr-3 min-w-52">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm shadow-sm transition-all duration-200 ${isVirtualShopAdminPath
            ? "border border-slate-300 bg-white text-slate-700 hover:border-[#6571FF]"
            : "border border-[#6571FF] bg-[#6571FF]/10 text-[#6571FF] hover:bg-[#6571FF]/15"
            }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {isVirtualShopAdminPath &&
              <Avatar
                photo={selectedShop?.logoUrl}
                width={22}
                height={22}
                className="shrink-0"
                alt={selectedShop?.storeName ?? "Shop"}
              />
            }
            <span className="truncate font-medium">
              {isVirtualShopAdminPath
                ? selectedShop?.storeName ?? selectedShop?.storeName
                : "View shop"}
            </span>
          </div>
          <ChevronDown
            size={16}
            className="text-slate-500 transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
          <DropdownMenuContent
            sideOffset={8}
            align="end"
            className="z-50 min-w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 duration-150"
          >
            {shops.map((shop) => {
              const isSelected = selectedShop?.id === shop.id;

              return (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => handleShopClick(shop.id)}
                  className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-150
              ${(isSelected && isVirtualShopAdminPath)
                      ? "bg-[#6571FF]/10 text-[#6571FF] font-semibold"
                      : "text-slate-700 hover:bg-slate-100"
                    }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar
                      photo={shop.logoUrl}
                      width={22}
                      height={22}
                      className="shrink-0"
                      alt={shop.storeName}
                    />
                    <span className="truncate">{shop.storeName}</span>
                  </div>

                  {/* Selected indicator */}
                  <span
                    className={`h-2 w-2 rounded-full transition-all duration-200 ${(isSelected && isVirtualShopAdminPath) ? "bg-[#6571FF] scale-100" : "scale-0"
                      }`}
                  />
                </button>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </div>
  );
}

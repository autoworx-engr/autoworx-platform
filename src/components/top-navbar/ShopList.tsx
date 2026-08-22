"use client";

import { useGetVirtualShops } from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import { cn } from "@/lib/cn";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, ExternalLink, Store } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import Avatar from "../Avatar";
import { normalizeShops } from "./shopNavigation";

const domain = new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname;

type ShopListProps = {
  className?: string;
  iconOnly?: boolean;
  triggerClassName?: string;
};

export default function ShopList({
  className,
  iconOnly = false,
  triggerClassName,
}: ShopListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useGetCurrentUser();
  const companyId = Number(currentUser?.companyId ?? 0);

  const { data: shopsData = [] } = useGetVirtualShops(companyId, {
    enabled: currentUser?.employeeType === "Admin" && companyId > 0,
  });

  const reverseShopData = shopsData.reverse();

  const shops = useMemo(
    () => normalizeShops(reverseShopData),
    [reverseShopData],
  );
  const isVirtualShopAdminPath = pathname.startsWith(
    "/dashboard/virtual-shop/admin/",
  );

  const selectedShopId = useMemo(() => {
    const match = pathname.match(/\/dashboard\/virtual-shop\/admin\/(\d+)/);
    const routeShopId = match?.[1] ? Number.parseInt(match[1], 10) : Number.NaN;

    if (Number.isFinite(routeShopId)) {
      return routeShopId;
    }

    return shops[0]?.id ?? 0;
  }, [pathname, shops]);

  const selectedShop =
    shops.find((shop) => shop.id === selectedShopId) ?? shops[0];

  const handleShopClick = (shopId: number) => {
    router.push(`/dashboard/virtual-shop/admin/${shopId}/services`);
  };

  const getPublicShopUrl = (slug?: string) => {
    if (!slug || typeof window === "undefined") {
      return null;
    }

    return `${window.location.protocol}//${slug}.${domain}${window.location.port ? ":" + window.location.port : ""}`;
  };

  if (currentUser?.employeeType !== "Admin" || shops.length === 0) {
    return null;
  }

  return (
    <div className={cn("mr-3 w-56", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            iconOnly
              ? "inline-flex h-9 w-9 items-center justify-center rounded-md text-white outline-none transition-colors "
              : `group flex w-full items-center justify-between rounded-xl border px-3 py-1.5 text-sm font-medium shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 ${
                  isVirtualShopAdminPath
                    ? "border-slate-200 bg-white/80 text-slate-800 backdrop-blur-md hover:border-slate-300 hover:bg-white hover:shadow-[0_4px_14px_-4px_rgba(0,0,0,0.1)] data-[state=open]:border-primary/50 data-[state=open]:bg-white data-[state=open]:shadow-[0_4px_14px_-4px_rgba(101,113,255,0.15)] data-[state=open]:ring-2 data-[state=open]:ring-primary/10"
                    : "border-primary/20 bg-gradient-to-b from-primary/5 to-primary/[0.02] text-primary hover:border-primary/40 hover:from-primary/10 hover:to-primary/5 data-[state=open]:border-primary/50 data-[state=open]:from-primary/15 data-[state=open]:to-primary/10 data-[state=open]:shadow-md"
                }`,
            triggerClassName,
          )}
        >
          {iconOnly ? (
            <Store size={18} strokeWidth={1.5} />
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-3">
                {isVirtualShopAdminPath && selectedShop?.logoUrl ? (
                  <Avatar
                    photo={selectedShop.logoUrl}
                    width={24}
                    height={24}
                    className="shrink-0 rounded-full border border-slate-200/60 shadow-sm"
                    alt={selectedShop.storeName || "Shop"}
                  />
                ) : isVirtualShopAdminPath ? (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-600">
                      {selectedShop?.storeName?.charAt(0)?.toUpperCase() || "S"}
                    </span>
                  </div>
                ) : (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Store size={14} strokeWidth={2.5} />
                  </div>
                )}
                <span className="truncate tracking-tight">
                  {isVirtualShopAdminPath
                    ? (selectedShop?.storeName ?? "Select Shop")
                    : "Virtual Shops"}
                </span>
              </div>
              <ChevronDown
                size={16}
                strokeWidth={2.5}
                className={`shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.87,0,0.13,1)] group-data-[state=open]:rotate-180 ${
                  isVirtualShopAdminPath ? "text-slate-400" : "text-primary/70"
                }`}
              />
            </>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
          <DropdownMenuContent
            sideOffset={8}
            align="end"
            className="z-50 w-64 overflow-hidden rounded-xl border border-slate-200/70 bg-white/95 p-1.5 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          >
            <div className="mb-1 flex items-center gap-2 border-b border-slate-100/80 px-3 pb-2 pt-2.5">
              <Store size={14} className="text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Your Shops
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {shops.map((shop) => {
                const isSelected = selectedShop?.id === shop.id;
                const publicShopUrl = getPublicShopUrl(shop.slug);

                return (
                  <DropdownMenuItem
                    key={shop.id}
                    onSelect={() => handleShopClick(shop.id)}
                    className={`group relative flex w-full border border-slate-100 cursor-pointer select-none items-center justify-between rounded-lg px-2 py-1.5 text-sm font-medium outline-none transition-colors data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 ${
                      isSelected && isVirtualShopAdminPath
                        ? "bg-primary/[0.04] text-primary data-[highlighted]:bg-primary/[0.08] data-[highlighted]:text-primary"
                        : "text-slate-700"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {shop.logoUrl ? (
                        <Avatar
                          photo={shop.logoUrl}
                          width={24}
                          height={24}
                          className="shrink-0 rounded-full border border-slate-100 shadow-sm transition-transform duration-300"
                          alt={shop.storeName}
                        />
                      ) : (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 shadow-sm transition-transform duration-300 group-hover:scale-105">
                          <span className="text-[12px] font-bold text-slate-500">
                            {shop.storeName?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="truncate tracking-tight">
                        {shop.storeName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSelected && isVirtualShopAdminPath && (
                        <Check
                          size={16}
                          strokeWidth={3}
                          className="shrink-0 text-primary animate-in zoom-in-50"
                        />
                      )}
                      {publicShopUrl && (
                        <a
                          href={publicShopUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center border rounded-md text-primary transition-colors hover:bg-slate-200/70 hover:text-slate-600"
                          aria-label={`Open ${shop.storeName} public shop`}
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </div>
  );
}

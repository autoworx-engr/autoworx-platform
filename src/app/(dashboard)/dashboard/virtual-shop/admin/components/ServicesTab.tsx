"use client";

import { useDeleteShopService } from "@/hooks/virtual-shop/service/useShopService";
import { ShopData, ShopServicesResponse } from "@/service/virtual-shop/api";
import { Pagination } from "antd";
import { Plus, Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useMemo, useState } from "react";
import ServiceCard, { type Service } from "./ServiceCard";

type ServicesTabProps = {
  shopConfig?: ShopData | null;
  servicesResponse?: ShopServicesResponse;
  currentSearch?: string;
};

export default function ServicesTab({
  shopConfig,
  servicesResponse,
  currentSearch = "",
}: ServicesTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(currentSearch);

  const shopId = shopConfig?.id;
  const meta = servicesResponse?.meta;

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch === currentSearch) {
        return;
      }

      const params = new URLSearchParams(searchParams?.toString() ?? "");

      if (nextSearch) {
        params.set("search", nextSearch);
      } else {
        params.delete("search");
      }

      params.set("page", "1");

      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    }, 400);

    return () => clearTimeout(timeout);
  }, [currentSearch, pathname, router, searchInput, searchParams]);

  const { mutateAsync: deleteService } = useDeleteShopService();

  const services: Service[] = useMemo(
    () =>
      (servicesResponse?.data ?? []).map((item) => ({
        id: item.id,
        name: item.title,
        shortDescription: item.shortDescription || undefined,
        category: item.category?.[0],
        price: Number(item.price ?? 0),
        duration: Number(item.duration ?? 0),
        imageUrl: item.imageUrl || "",
        isActive: item.isActive,
      })),
    [servicesResponse?.data],
  );

  const handleEdit = (service: Service) => {
    if (!shopId) return;

    router.push(
      `/dashboard/virtual-shop/admin/service/create?shopId=${shopId}&serviceId=${service.id}`,
    );
  };

  const handleDelete = async (service: Service) => {
    if (!shopId) return;

    try {
      await deleteService({ id: service.id, shopId });
      router.refresh();
    } catch {}
  };

  const handleAddService = () => {
    if (!shopId) return;

    router.push(
      `/dashboard/virtual-shop/admin/service/create?shopId=${shopId}`,
    );
  };

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    params.set("page", String(nextPage));
    params.set("limit", String(nextPageSize));

    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div
          className="
            group relative flex w-full items-center gap-x-3 rounded-xl
            bg-white px-4 py-2.5 lg:w-[300px] xl:w-[400px]
            ring-1 ring-slate-200
            shadow-sm transition-all duration-300 ease-out
            focus-within:ring-2 focus-within:ring-indigo-500/20
            focus-within:shadow-md focus-within:shadow-indigo-500/5
            hover:ring-slate-300
          "
        >
          <span className="text-slate-400 transition-colors duration-300 group-focus-within:text-primary">
            <Search className="h-5 w-5" />
          </span>
          <input
            name="search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Services..."
            className="w-full bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <button
          onClick={handleAddService}
          className="
            flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white
            bg-gradient-to-r from-primary to-[#5a66ee]
            shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
            hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
            hover:-translate-y-0.5
            active:translate-y-0 active:scale-100
            transition-all duration-300 ease-in-out
        "
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {/* Service list */}
      <div className="min-h-[65vh] max-h-[65vh] overflow-y-auto thin-scrollbar pr-1">
        <div className="flex flex-col gap-2">
          {!shopId ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-sm text-gray-500">
                Configure your shop first.
              </p>
              <a
                href="/dashboard/settings/virtual-shop-configure"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_0_rgba(101,113,255,0.39)] transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]"
              >
                Go to shop configure
              </a>
            </div>
          ) : services.length === 0 ? (
            <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/30 p-12 text-center">
              {/* Ghost Icon Illustration */}
              <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/50">
                <Search
                  size={24}
                  className="text-slate-300"
                  strokeWidth={1.5}
                />
                {/* Decorative ripple effect */}
                <div className="absolute inset-0 animate-ping rounded-3xl bg-slate-100 opacity-20" />
              </div>

              {/* Text Content */}
              <h3 className="mb-2 text-lg font-bold text-slate-500">
                No Services Found
              </h3>
              <p className="max-w-[280px] text-sm font-medium leading-relaxed text-slate-400">
                We couldn't find any services. Try adjusting your search or add
                a new service.
              </p>
            </div>
          ) : (
            services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                shopId={shopId}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {shopId && meta && services.length > 0 && (
        <div className="flex items-center justify-end border-t border-gray-200 pt-2">
          <Pagination
            className="custom-pagination"
            current={meta.page}
            pageSize={meta.limit}
            total={meta.totalRecords}
            onChange={handlePageChange}
            showSizeChanger
            pageSizeOptions={["10", "20", "50", "100"]}
            showTotal={(total) => `${total} total`}
          />
        </div>
      )}
    </div>
  );
}

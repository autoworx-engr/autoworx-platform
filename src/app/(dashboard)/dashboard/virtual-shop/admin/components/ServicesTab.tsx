"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import ServiceCard, { type Service } from "./ServiceCard";
import { useRouter } from "nextjs-toploader/app";
import { Pagination } from "antd";
import { usePathname, useSearchParams } from "next/navigation";
import { ShopData, ShopServicesResponse } from "@/service/virtual-shop/api";
import { useDeleteShopService } from "@/hooks/virtual-shop/service/useShopService";

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
        category: item.category?.[0],
        price: Number(item.price ?? 0),
        duration: Number(item.duration ?? 0),
        imageUrl: item.imageUrl || "",
      })),
    [servicesResponse?.data],
  );

  const handleEdit = (service: Service) => {
    router.push(`/dashboard/virtual-shop/admin/service/create?serviceId=${service.id}`);
  };

  const handleDelete = async (service: Service) => {
    if (!shopId) return;

    try {
      await deleteService({ id: service.id, shopId });
      router.refresh();
    } catch {
    }
  };

  const handleAddService = () => {
    router.push("/dashboard/virtual-shop/admin/service/create");
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
        <div className="relative flex-1 max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search services..."
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#6571FF] focus:ring-1 focus:ring-[#6571FF]"
          />
        </div>

        <button
          onClick={handleAddService}
          className="
            flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white
            bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
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
      <div className="min-h-[40vh] max-h-[65vh] overflow-y-auto thin-scrollbar pr-1">
        <div className="flex flex-col gap-2">
          {!shopId ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Configure your virtual shop first to manage services.
            </p>
          ) : services.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No services found.
            </p>
          ) : (
            services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {shopId && meta && (
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

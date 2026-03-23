"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import ServiceCard, { type Service } from "./ServiceCard";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Pagination } from "antd";
import { useGetVirtualShopConfigure } from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";

type ShopServiceApi = {
  id: number;
  title: string;
  category: string[];
  price: number | string;
  duration: number;
  imageUrl?: string | null;
};

type ShopServicesResponse = {
  success: boolean;
  meta: {
    totalRecords: number;
    totalPages: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  data: ShopServiceApi[];
};

export default function ServicesTab() {
  const router = useRouter();
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const companyId = session?.user?.companyId;
  const normalizedCompanyId = companyId ?? 0;

  useEffect(() => {
    setPage(1);
  }, [search, limit]);

  const { data: shopConfig, isLoading: isShopConfigLoading } =
    useGetVirtualShopConfigure(normalizedCompanyId);

  const shopId = shopConfig?.id;

  const {
    data: servicesResponse,
    isLoading: isServicesLoading,
    isError: isServicesError,
  } = useQuery({
    queryKey: ["virtual-shop-services", shopId, page, limit, search],
    queryFn: async () => {
      const response = await axios.get<ShopServicesResponse>(
        "/api/virtual-shop/shop-services",
        {
          params: {
            shopId,
            page,
            limit,
            search: search || undefined,
          },
        },
      );

      return response.data;
    },
    enabled: !!shopId,
    staleTime: 1000 * 30,
  });

  const meta = servicesResponse?.meta;

  const services: Service[] = useMemo(
    () =>
      (servicesResponse?.data ?? []).map((item) => ({
        id: item.id,
        name: item.title,
        category: item.category?.[0] || "Uncategorized",
        price: Number(item.price ?? 0),
        duration: Number(item.duration ?? 0),
        imageUrl: item.imageUrl || "",
      })),
    [servicesResponse?.data],
  );

  const handleEdit = (service: Service) => {
    // TODO: open edit dialog
    void service;
  };

  const handleDelete = (service: Service) => {
    void service;
  };

  const handleAddService = () => {
    router.push("/dashboard/virtual-shop/admin/service/create");
  };

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    setPage(nextPage);
    setLimit(nextPageSize);
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#6571FF] focus:ring-1 focus:ring-[#6571FF]"
          />
        </div>

        <button
          onClick={handleAddService}
          className="flex items-center gap-1.5 rounded-md bg-[#6571FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5560ee] transition-colors"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {/* Service list */}
      <div className="max-h-[60vh] overflow-y-auto thin-scrollbar pr-1">
        <div className="flex flex-col gap-2">
          {isShopConfigLoading || isServicesLoading ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Loading services...
            </p>
          ) : !shopId ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Configure your virtual shop first to manage services.
            </p>
          ) : isServicesError ? (
            <p className="py-8 text-center text-sm text-red-400">
              Failed to load services.
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

      {shopId && meta && !isServicesLoading && !isServicesError && (
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

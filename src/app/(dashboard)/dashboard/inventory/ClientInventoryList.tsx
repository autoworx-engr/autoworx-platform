"use client";

import { useInventoryDatabaseSearchStore } from "@/stores/inventoryDatabaseSearchStore";
import {
  Category,
  InventoryProduct as PrismaInventoryProduct,
  User,
  Vendor,
} from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import InventoryList from "./InventoryList";

type InventoryProductWithRelations = PrismaInventoryProduct & {
  category: Category | null;
  vendor: Vendor | null;
  User?: User | null;
};

type Props = {
  supplies: InventoryProductWithRelations[];
  products: InventoryProductWithRelations[];
  view: string;
  productId: number;
  user: User;
  inventoryCategories: string[];
  totalSupplies: number;
  totalProducts: number;
  searchParams: {
    page: string;
    limit: string;
    search?: string;
    category?: string;
  };
};

type InventoryProduct = {
  id: string;
  productName: string;
  category: string;
  unit: string;
};

type ProductsResponse = {
  data: InventoryProduct[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export default function ClientInventoryList({
  supplies,
  products,
  view,
  productId,
  user,
  inventoryCategories,
  searchParams,
  totalProducts,
  totalSupplies,
}: Props) {
  const { search, categoryName, page, limit, setPage, setLimit, resetFilters } =
    useInventoryDatabaseSearchStore();

  useEffect(() => {
    resetFilters();
  }, []);

  const { data, isLoading, isFetching, isError } = useQuery<ProductsResponse>({
    queryKey: ["inventory-database", search, categoryName, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryName) params.set("categoryName", categoryName);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(
        `/api/inventoryWirehouse/products?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch inventory products");

      return res.json();
    },
    enabled: view === "database",
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
  };

  return (
    <InventoryList
      products={products}
      supplies={supplies}
      productId={productId}
      user={user}
      searchParams={searchParams}
      totalProducts={totalProducts}
      totalSupplies={totalSupplies}
      isLoading={isLoading || isFetching}
      isFullWidth={view === "database"}
      databaseContent={data?.data || []}
      totalDatabaseItems={data?.meta.totalCount || 0}
      categories={inventoryCategories}
      onPageChange={handlePageChange}
      onLimitChange={handleLimitChange}
      currentPage={page}
      currentLimit={limit}
    />
  );
}

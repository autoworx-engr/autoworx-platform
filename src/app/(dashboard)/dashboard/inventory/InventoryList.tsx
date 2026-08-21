"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Tabs";
import { Category, InventoryProduct, User, Vendor } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type InventoryProductWithRelations = InventoryProduct & {
  category: Category | null;
  vendor: Vendor | null;
  User?: User | null;
};
import ProductTable from "./ProductTable";
import SearchFilter from "./SearchFilter";

import DatabaseFilterHeader from "./DatabaseFilterHeader";
import DatabaseTable from "./DatabaseTable";

export default function InventoryList({
  products,
  supplies,
  productId,
  user,
  isFullWidth = false,
  databaseContent,
  totalDatabaseItems,
  categories,
  searchParams,
  totalProducts,
  totalSupplies,
  isLoading,
}: {
  products: InventoryProductWithRelations[];
  supplies: InventoryProductWithRelations[];
  productId: number;
  user: User;
  isFullWidth?: boolean;
  databaseContent: any[];
  totalDatabaseItems: number;
  isLoading?: boolean;
  categories: any[];
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  currentPage: number;
  currentLimit: number;
  totalProducts: number;
  totalSupplies: number;
  searchParams: {
    page: string;
    limit: string;
    search?: string;
    category?: string;
  };
}) {
  const router = useRouter();
  const search = useSearchParams();
  const view = search?.get("view") ?? "products";

  useEffect(() => {
    if (!search?.get("view")) {
      router.push("/dashboard/inventory?view=products");
    }
  }, [search, router]);

  return (
    <Tabs
      value={view}
      className={`col-start-1 mt-3 flex min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden text-xs lg:h-[83vh] lg:overflow-clip 2xl:text-base ${isFullWidth ? "md:w-full" : "lg:w-1/2"} `}
    >
      <TabsList>
        <TabsTrigger
          value="database"
          onClick={() => router.push("/dashboard/inventory?view=database")}
        >
          Database
        </TabsTrigger>

        {(user.employeeType === "Admin" || user.employeeType === "Manager") && (
          <TabsTrigger
            value="supplies"
            onClick={() => router.push("/dashboard/inventory?view=supplies")}
          >
            Supplies
          </TabsTrigger>
        )}
        {user.employeeType !== "Technician" && (
          <TabsTrigger
            value="products"
            onClick={() => router.push("/dashboard/inventory?view=products")}
          >
            Products
          </TabsTrigger>
        )}
      </TabsList>

      {view === "products" && (
        <TabsContent
          value="products"
          className={`mx-2 my-0 py-0 flex min-h-0 flex-col overflow-y-auto lg:overflow-hidden md:visible md:static md:opacity-100 ${productId ? "invisible absolute opacity-0" : "visible static opacity-100"}`}
        >
          <div className="relative flex h-full w-full flex-col">
            <div className="sticky top-0 z-50 bg-white pb-2 pt-2">
              <SearchFilter
                searchParams={{
                  search: searchParams.search,
                  category: searchParams.category,
                }}
              />
            </div>
            <ProductTable
              searchParams={searchParams}
              products={products as any}
              totalItems={totalProducts}
              currentProductId={productId}
              user={user}
            />
          </div>
        </TabsContent>
      )}

      {view === "supplies" && (
        <TabsContent
          value="supplies"
          className={`mx-2 my-0 py-0 flex min-h-0 flex-col overflow-y-auto lg:overflow-hidden md:visible md:static md:opacity-100 ${productId ? "invisible absolute opacity-0" : "visible static opacity-100"}`}
        >
          <div className="relative flex h-full w-full flex-col">
            <div className="sticky top-0 z-50 bg-white pb-2 pt-2">
              <SearchFilter
                searchParams={{
                  search: searchParams.search,
                  category: searchParams.category,
                }}
              />
            </div>
            <ProductTable
              totalItems={totalSupplies}
              searchParams={searchParams}
              products={supplies as any}
              currentProductId={productId}
              user={user}
            />
          </div>
        </TabsContent>
      )}

      {view === "database" && (
        <TabsContent
          value="database"
          className={`mx-2 flex min-h-0 flex-col p-0 md:visible md:static md:opacity-100`}
        >
          <div className="relative flex h-full w-full flex-col">
            {/* Fixed filter header */}
            <div className="sticky top-0 z-50 bg-white pb-2 pt-2">
              <DatabaseFilterHeader categories={categories} />
            </div>

            {/* Scrollable content area */}
            <div className="h-full overflow-y-auto">
              <DatabaseTable
                totalItems={totalDatabaseItems}
                data={databaseContent}
                isLoading={isLoading}
              />
            </div>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}

import { authOptions } from "@/authOptions";
import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { InventoryProductType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { cache } from "react";
import AddNewProduct from "./AddNewProduct";
import ClientInventoryList from "./ClientInventoryList";
import Sidebar from "./Sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Manage your inventory, products, and supplies",
};

async function getCategories() {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/inventoryWirehouse/category`,

      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    if (!res.ok) throw new Error("Failed to fetch categories");
    return res.json();
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
}

type TGetInventoryItem = {
  type: InventoryProductType;
  page: number;
  limit: number;
  search?: string;
  category?: string;
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const matchesWord = (name: string, term: string) =>
  new RegExp(`\\b${escapeRegExp(term)}`, "i").test(name);

const getInventoryItem = cache(
  async ({ type, page, limit, search = "", category }: TGetInventoryItem) => {
    try {
      const companyId = await getCompanyId();
      const searchTerms = search
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length > 0);
      const searchFilterOR = [
        { name: { contains: search.trim() } },
        { name: { contains: search?.trim().toUpperCase() } },
        { name: { contains: search?.trim().toLowerCase() } },
        {
          name: {
            contains: search
              .trim()
              ?.split(" ")
              .map((t) => t.trim().charAt(0).toUpperCase() + t.slice(1))
              .join(" "),
          },
        },
        ...(searchTerms.length > 0
          ? [
              {
                OR: searchTerms.flatMap((term) => [
                  { name: { contains: term.trim() } },
                ]),
              },
            ]
          : []),
      ];
      const whereClause = {
        companyId,
        type: type,
        OR: search ? searchFilterOR : undefined,
        ...(category ? { category: { name: category } } : {}),
      };
      const fetchPage = (skip?: number) =>
        db.inventoryProduct.findMany({
          where: whereClause,
          include: {
            category: true,
            vendor: true,
            User: type === "Supply" ? true : false,
          },
          ...(skip === undefined ? {} : { skip, take: limit }),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });

      const [fetchedItems, fetchedCount] = await Promise.all([
        fetchPage(search ? undefined : (page - 1) * limit),
        db.inventoryProduct.count({ where: whereClause }),
      ]);

      if (
        !search &&
        page > 1 &&
        fetchedItems.length === 0 &&
        fetchedCount > 0
      ) {
        return { data: await fetchPage(0), totalItems: fetchedCount };
      }

      if (search && searchTerms.length > 0) {
        const filtered = fetchedItems.filter((item) => {
          const name = (item.name ?? "").toLowerCase();
          return searchTerms.every((term) => matchesWord(name, term));
        });
        return { data: filtered, totalItems: filtered.length };
      }

      return { data: fetchedItems, totalItems: fetchedCount };
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to fetch ${type.toLowerCase()}s`);
    }
  },
);

export default async function Page(props: {
  searchParams: Promise<{
    productId: string;
    view: string;
    page?: string;
    limit?: string;
    search?: string;
    category?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  const {
    productId,
    view,
    page = "1",
    limit = "50",
    search,
    category,
  } = searchParams;

  const companyId = await getCompanyId();

  const [
    { data: supplies, totalItems: totalSupplies },
    { data: products, totalItems: totalProducts },
    inventoryCategoriesResult,
    categories,
    vendors,
    user,
  ] = await Promise.all([
    getInventoryItem({
      type: "Supply",
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      category,
    }),
    getInventoryItem({
      type: "Product",
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      category,
    }),
    getCategories(),
    db.category.findMany({ where: { companyId } }),
    db.vendor.findMany({ where: { companyId } }),
    getUser(),
  ]);

  const inventoryCategories = inventoryCategoriesResult ?? [];

  return (
    <div className="h-full w-full">
      <SyncLists categories={categories} vendors={vendors} />

      <header className="flex justify-between p-3 md:p-0">
        <div className="flex items-center">
          <Title>Inventory</Title>
        </div>

        {(user?.employeeType === "Admin" ||
          user?.employeeType === "Manager") && (
          <div className="mt-2">
            <AddNewProduct view={view} />
          </div>
        )}
      </header>

      <div className="mb-5 flex h-full w-full flex-col justify-between gap-3 md:mb-0 lg:flex-wrap">
        <ClientInventoryList
          searchParams={{
            page,
            limit,
            search,
            category,
          }}
          supplies={supplies}
          products={products}
          totalSupplies={totalSupplies}
          totalProducts={totalProducts}
          view={view}
          productId={parseInt(productId || "0")}
          user={user}
          inventoryCategories={inventoryCategories?.data}
        />

        <Sidebar
          hidden={view === "database"}
          productId={parseInt(productId || "0")}
        />
      </div>
    </div>
  );
}

import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import AddNewProduct from "./AddNewProduct";
import Sidebar from "./Sidebar";
import ClientInventoryList from "./ClientInventoryList";

async function getCategories() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/inventoryWirehouse/category`,
    { cache: "no-store" }
  );

  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export default async function Page({
  searchParams: { productId, view },
}: {
  searchParams: {
    productId: string;
    view: string;
  };
}) {
  const companyId = await getCompanyId();

  const inventoryCategories = await getCategories();
  const supplies = await db.inventoryProduct.findMany({
    where: { companyId, type: "Supply" },
    include: { category: true, vendor: true, User: true },
  });

  const products = await db.inventoryProduct.findMany({
    where: { companyId, type: "Product" },
    include: { category: true, vendor: true },
  });

  const categories = await db.category.findMany({ where: { companyId } });
  const vendors = await db.vendor.findMany({ where: { companyId } });

  const user = await getUser();

  return (
    <div className="h-full w-full">
      <SyncLists categories={categories} vendors={vendors} />

      <header className="flex justify-between p-3 md:p-0">
        <div className="flex items-center">
          <Title className="text-[20px] md:text-2xl">Inventory</Title>
        </div>

        {(user?.employeeType === "Admin" ||
          user?.employeeType === "Manager") && (
          <div className="mt-2">
            <AddNewProduct />
          </div>
        )}
      </header>

      <div className="mb-5 flex h-full w-full flex-col justify-between gap-3 md:mb-0 md:flex-wrap">
        <ClientInventoryList
          supplies={supplies}
          products={products}
          view={view}
          productId={parseInt(productId || "0")}
          user={user}
          inventoryCategories={inventoryCategories.data}
        />

        <Sidebar
          hidden={view === "database"}
          productId={parseInt(productId || "0")}
        />
      </div>
    </div>
  );
}

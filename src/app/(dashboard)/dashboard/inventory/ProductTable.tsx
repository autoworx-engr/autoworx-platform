"use client";

import { deleteInventory } from "@/actions/inventory/delete";
import InventoryResponsiveCard from "@/components/mobile-responsive/inventory/ResponsiveInventoryCard";
import { cn } from "@/lib/cn";
import getUser from "@/lib/getUser";
import { useInventoryFilterStore } from "@/stores/inventoryFilter";
import { ProductCardProps } from "@/types/inventory";
import { Category, InventoryProduct, User, Vendor } from "@prisma/client";
import { Pagination, Popconfirm, Tooltip } from "antd"; // Importing the Pagination component from Ant Design
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import EditProduct from "./EditProduct";

const evenColor = "bg-background";
const oddColor = "bg-blue-100";

export default function ProductTable({
  currentProductId,
  products,
}: {
  currentProductId: number | undefined;
  products: (InventoryProduct & {
    category: Category;
    vendor: Vendor;
    User?: User;
  })[];
}) {
  const router = useRouter();
  const search = useSearchParams();
  const viewTab = search?.get("view");
  async function getUserInfo() {
    getUser().then((user) => {
      setUser(user);
    });
  }
  const { search: productSearch, category } = useInventoryFilterStore();
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showPagination, setShowPagination] = useState(false);

  useEffect(() => {
    const filtered = products
      .filter((product) => {
        if (
          productSearch &&
          !product.name.toLowerCase().includes(productSearch.toLowerCase())
        ) {
          return false;
        }
        if (category && !product.category) {
          return false;
        }
        if (category && product.category.name !== category) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort products by name;
    setFilteredProducts(filtered);
  }, [productSearch, category, products]);

  useEffect(() => {
    getUserInfo();
  }, []);

  useEffect(() => {
    if (filteredProducts.length > 10) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [filteredProducts]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <>
      {/* card list  */}
      <div className="mt-4 space-y-2 lg:hidden ">
        {paginatedProducts.map((product, index) => {
          return (
            <div key={index}>
              <InventoryResponsiveCard
                user={user}
                viewTab={viewTab!}
                search={search!}
                product={
                  {
                    ...product,
                    price: product.price?.toString(),
                  } as ProductCardProps
                }
                index={index}
              />
            </div>
          );
        })}

        {/* Extra bottom padding to prevent overlap */}
        <div className="h-20 lg:hidden" />
      </div>

      <div className="thin-scrollbar hidden h-[calc(70vh-78px)] overflow-auto lg:block">
        <table className="w-full">
          <thead className="bg-background">
            <tr className="h-10 border-b">
              <th className="px-4 text-left">#</th>
              <th className="px-4 text-left">Name</th>
              <th className="px-4 text-left">Category</th>
              <th className="px-4 text-left 2xl:px-10">Quantity</th>
              <th className="px-4 text-left 2xl:px-10">Unit</th>
              {(user?.employeeType === "Admin" ||
                user?.employeeType === "Manager") && (
                <th className="px-4 text-left 2xl:px-10">Action</th>
              )}
            </tr>
          </thead>

          <tbody>
            {paginatedProducts.map((product, index) => (
              <tr
                key={product.id}
                className={cn(
                  "h-full cursor-pointer rounded-md py-3",
                  index % 2 === 0 ? evenColor : oddColor,
                  currentProductId === product.id && "border-2 border-[#6571FF]"
                )}
                onClick={() =>
                  router.push(
                    `/dashboard/inventory?view=${search?.get("view")}&productId=${product.id}`
                  )
                }
              >
                <td className="h-12 px-4 text-left">
                  <p>{(currentPage - 1) * pageSize + index + 1}</p>
                </td>
                <td className="max-w-36 px-4 text-left">
                  <div className="flex items-center gap-2">
                    {Number(product.quantity) === 0 ? (
                      <Tooltip title="Product is out of stock" placement="top">
                        <span className="text-red-600">{product.name}</span>
                      </Tooltip>
                    ) : Number(product.quantity) <=
                      Number(product.lowInventoryAlert) ? (
                      <Tooltip
                        title="Product has low inventory"
                        placement="top"
                      >
                        <span className="text-amber-600">{product.name}</span>
                      </Tooltip>
                    ) : (
                      <span>{product.name}</span>
                    )}
                  </div>
                </td>
                <td className="max-w-36 px-4 text-left truncate">
                  {product.category?.name}
                </td>
                <td className="px-4 text-left 2xl:px-10">
                  {Number(product.quantity)}
                </td>
                <td className="px-4 text-left 2xl:px-10">{product.unit}</td>
                {(user?.employeeType === "Admin" ||
                  user?.employeeType === "Manager") && (
                  <td>
                    <div className="flex h-12 items-center justify-start gap-3 px-4 2xl:px-10">
                      <button className="text-2xl text-blue-600">
                        <EditProduct productData={product} />
                      </button>
                      <Popconfirm
                        title={`Are you sure you want to delete this ${viewTab === "products" ? "product" : "supply"}?`}
                        onConfirm={async () => {
                          await deleteInventory(product.id);
                          router.push(
                            `/dashboard/inventory?view=${search?.get("view")}`
                          );
                        }}
                        okText="Yes"
                        cancelText="No"
                      >
                        <FaTimes className="text-xl text-red-400" />
                      </Popconfirm>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="mt-4 hidden h-10 items-center justify-end lg:flex">
          <Pagination
            className="custom-pagination"
            current={currentPage}
            pageSize={pageSize}
            total={filteredProducts.length}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        </div>
      )}
    </>
  );
}

"use client";

import { cn } from "@/lib/cn";
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import AddNewProduct from "./AddNewProduct";
import { useInventoryDatabaseSearchStore } from "@/stores/inventoryDatabaseSearchStore"; // Import Zustand store

export interface DatabaseData {
  id: string;
  productName: string;
  category: string;
  unit: string;
}

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

export default function DatabaseTable({
  data,
  totalItems,
}: {
  data: DatabaseData[];
  totalItems?: number;
}) {
  const { page, limit, setPage, setLimit } = useInventoryDatabaseSearchStore(); // Access Zustand store

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage); // Update page in Zustand store
    if (newPageSize) {
      setLimit(newPageSize); // Update limit in Zustand store
    }
  };

  return (
    <div className="min-h-[65vh] pb-2">
      {/* Desktop View */}
      <div className="hidden overflow-hidden overflow-x-scroll rounded-md bg-background md:block">
        <table className="w-full md:table-fixed">
          {/* Database Header */}
          <thead className="bg-background">
            <tr className="h-10">
              <th className="w-16 px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Unit</th>
              <th className="px-4 py-2 text-left"></th>
            </tr>
          </thead>

          {/* Database List */}
          <tbody className="w-full">
            {data.map((item, index) => (
              <tr
                key={item.id}
                className={cn("py-3", index % 2 === 0 ? evenColor : oddColor)}
              >
                <td className="w-16 px-4 py-2 text-left">
                  <p className="block h-full">{item.id}</p>
                </td>
                <td className="px-4 py-2 text-left">
                  <p className="block h-full w-full truncate">
                    {item.productName}
                  </p>
                </td>
                <td className="px-4 py-2 text-left">
                  <p className="block h-full w-full truncate">
                    {item.category}
                  </p>
                </td>
                <td className="px-4 py-2 text-left">
                  <p className="block h-full w-full">{item.unit}</p>
                </td>
                <td className="px-4 py-2 text-center">
                  <p className="block h-full w-full">
                    <AddNewProduct product={item} isDatabase={true} />
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View - Card Layout */}
      <div className="space-y-3 md:hidden">
        {data.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "rounded-lg border border-gray-200 p-4 shadow-sm",
              index % 2 === 0 ? evenColor : oddColor
            )}
          >
            <div className="flex flex-col gap-2">
              {/* Product name and ID row */}
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500">Name</div>
                  <div className="text-sm font-medium text-gray-800">
                    {item.productName}
                  </div>
                </div>

                {/* Highlighted ID */}
                <div className="  px-3 py-1 rounded-md ">
                  <div className="text-base font-bold text-gray-400">
                    {item.id}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <div className="text-xs text-gray-500">Category</div>
                <div className="text-sm text-gray-800">{item.category}</div>
              </div>

              {/* Unit */}
              <div>
                <div className="text-xs text-gray-500">Unit</div>
                <div className="text-sm text-gray-800">{item.unit}</div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200">
              <AddNewProduct product={item} isDatabase={true} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Pagination
          className="custom-pagination"
          current={page}
          pageSize={limit}
          total={totalItems || 0}
          onChange={handlePageChange}
          showSizeChanger
          onShowSizeChange={handlePageChange}
        />
      </div>
    </div>
  );
}

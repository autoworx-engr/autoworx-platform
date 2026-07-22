"use client";

import CarLoading from "@/components/common/CarLoading";
import { cn } from "@/lib/cn";
import { useInventoryDatabaseSearchStore } from "@/stores/inventoryDatabaseSearchStore"; // Import Zustand store
import { Pagination } from "antd"; // Importing the Pagination component from Ant Design
import AddNewProduct from "./AddNewProduct";

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
  isLoading = true,
}: {
  data: DatabaseData[];
  totalItems?: number;
  isLoading?: boolean;
}) {
  const { page, limit, setPage, setLimit } = useInventoryDatabaseSearchStore(); // Access Zustand store

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage); // Update page in Zustand store
    if (newPageSize) {
      setLimit(newPageSize); // Update limit in Zustand store
    }
  };

  return (
    <div className="w-full p-4 bg-background dark:bg-slate-950 flex flex-col rounded-lg drop-shadow-[0_4px_4px_rgb(0_0_0_/_0.25)] h-full">
      {/* Desktop View */}
      <div className="hidden bg-background md:block flex-1 overflow-auto">
        <table className="w-full border-separate border-spacing-0 md:table-fixed">
          {/* Database Header */}
          <thead className="sticky top-0 z-10 bg-white shadow-sm">
            <tr className="h-10 border-b">
              <th className="w-16 px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Unit</th>
              <th className="px-4 py-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5}>
                  <CarLoading />
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((item, index) => (
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
                    <p className="block h-full w-fit">
                      <AddNewProduct product={item} isDatabase={true} />
                    </p>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <p className="p-20 text-center text-slate-500 font-medium">
                    No data found
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View - Card Layout */}
      <div className="space-y-3 md:hidden px-2">
        {" "}
        {/* Added some horizontal padding for mobile */}
        {isLoading ? (
          <CarLoading />
        ) : data.length > 0 ? (
          data.map((item, index) => (
            <div
              key={item.id}
              // Sleek Card Styling for mobile: Rounded, subtle ring, soft shadow, glassmorphism-like background
              className={cn(
                "rounded-xl ring-1 ring-slate-200/60 p-4 shadow-md",
                "backdrop-blur-sm transition-all duration-300 ease-in-out", // Glassmorphism and subtle animation
                index % 2 === 0
                  ? `bg-slate-50/70 ${evenColor}`
                  : `bg-white/70 ${oddColor}`, // Translucent backgrounds
                "active:scale-[0.98] active:shadow-lg", // Subtle active state for touch
              )}
            >
              <div className="flex flex-col gap-3">
                {/* Product name and ID row */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  {" "}
                  {/* Subtle divider */}
                  <div>
                    <div className="text-xs font-medium text-slate-500">
                      Name
                    </div>
                    <div className="text-base font-semibold text-slate-800 truncate max-w-[220px]">
                      {" "}
                      {/* Truncate long names */}
                      {item.productName}
                    </div>
                  </div>
                  {/* Highlighted ID with subtle background and accent color */}
                  <div className="bg-slate-100/80 px-3 py-1 rounded-full ring-1 ring-slate-200">
                    <div className="text-sm font-bold text-primary">
                      {" "}
                      {/* Accent color for ID */}#{item.id}
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <div className="text-xs font-medium text-slate-500">
                    Category
                  </div>
                  <div className="text-sm text-slate-700">{item.category}</div>
                </div>

                {/* Unit */}
                <div>
                  <div className="text-xs font-medium text-slate-500">Unit</div>
                  <div className="text-sm text-slate-700">{item.unit}</div>
                </div>
              </div>

              {/* Action Button Section */}
              <div className="mt-4 pt-4 border-t border-slate-200/50 w-full">
                {" "}
                {/* Refined divider */}
                <AddNewProduct product={item} isDatabase={true} />
              </div>
            </div>
          ))
        ) : (
          <div className="p-20 text-center text-slate-500 font-medium">
            No data found
          </div>
        )}
      </div>

      <div className="mt-auto flex shrink-0 justify-end bg-white px-4 py-2 shadow-[0_-1px_2px_rgba(0,0,0,0.04)]">
        {!isLoading && data.length == 0 && (
          <Pagination
            className="custom-pagination"
            current={page}
            pageSize={limit}
            total={totalItems || 0}
            onChange={handlePageChange}
            showSizeChanger
            onShowSizeChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}

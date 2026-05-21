"use client";

import CarLoading from "@/components/common/CarLoading";
import {
  Column,
  DataTable,
  MobileCard,
  MobileCardField,
} from "@/components/data-table";
import { useInventoryDatabaseSearchStore } from "@/stores/inventoryDatabaseSearchStore";
import AddNewProduct from "./AddNewProduct";

export interface DatabaseData {
  id: string;
  productName: string;
  category: string;
  unit: string;
}

export default function DatabaseTable({
  data,
  totalItems = 0,
  isLoading = false,
}: {
  data: DatabaseData[];
  totalItems?: number;
  isLoading?: boolean;
}) {
  const { page, limit, setPage, setLimit } = useInventoryDatabaseSearchStore();

  const handlePageChange = (newPage: number, newSize?: number) => {
    setPage(newPage);
    if (newSize) setLimit(newSize);
  };

  const columns: Column<DatabaseData>[] = [
    {
      key: "id",
      header: "#",
      width: "w-16",
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700">#{row.id}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {row.productName}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (row) => (
        <span className="text-sm text-slate-700">{row.category || "—"}</span>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      cell: (row) => (
        <span className="text-sm text-slate-700">{row.unit || "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-32",
      align: "right",
      cell: (row) => <AddNewProduct product={row} isDatabase={true} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey={(r) => r.id}
      isLoading={isLoading}
      loadingComponent={<CarLoading />}
      emptyMessage="No data found"
      pagination={{
        currentPage: page,
        pageSize: limit,
        totalItems,
        onChange: handlePageChange,
        itemLabel: "items",
      }}
      renderMobileCard={(row) => (
        <MobileCard>
          <div className="mb-3 flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-slate-400">#{row.id}</p>
              <p className="truncate text-base font-bold text-slate-700 dark:text-slate-200">
                {row.productName}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MobileCardField label="Category" value={row.category || "—"} />
            <MobileCardField label="Unit" value={row.unit || "—"} />
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800"
          >
            <AddNewProduct product={row} isDatabase={true} />
          </div>
        </MobileCard>
      )}
    />
  );
}

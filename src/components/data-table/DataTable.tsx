"use client";

import { cn } from "@/lib/cn";
import { EmptyState } from "./cells";
import { Paginator } from "./Paginator";
import { Column, DataTableProps } from "./types";

function alignClass(align?: "left" | "center" | "right") {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  pagination,
  toolbar,
  renderMobileCard,
  onRowClick,
  selectedRowKey,
  isLoading = false,
  loadingComponent,
  emptyMessage = "No data found",
  emptyState,
  density = "cozy",
  scrollHeight = "h-[calc(75vh-110px)]",
  striped = true,
  className,
}: DataTableProps<T>) {
  const rowPy =
    density === "compact" ? "py-1" : density === "comfy" ? "py-3.5" : "py-2.5";

  const renderEmpty = () => emptyState ?? <EmptyState message={emptyMessage} />;

  const renderLoading = () =>
    loadingComponent ?? (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6571FF] border-t-transparent" />
      </div>
    );

  return (
    <div className={cn("flex flex-col", className)}>
      {toolbar && <div className="flex-shrink-0">{toolbar}</div>}

      {/* Mobile card list */}
      {renderMobileCard && (
        <div className="space-y-2 md:hidden">
          {isLoading
            ? renderLoading()
            : data.length === 0
              ? renderEmpty()
              : data.map((row, idx) => (
                  <div key={rowKey(row)}>{renderMobileCard(row, idx)}</div>
                ))}
          <div className="h-20" />
        </div>
      )}

      {/* Desktop table */}
      <div
        className={cn(
          "thin-scrollbar overflow-auto overflow-x-auto",
          scrollHeight,
          renderMobileCard ? "hidden md:block" : "block",
        )}
      >
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-white dark:bg-slate-950">
            <tr className="border-b border-slate-100 text-sm capitalize tracking-wide text-slate-500 dark:border-slate-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2 font-medium",
                    alignClass(col.align),
                    col.width,
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length}>{renderLoading()}</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>{renderEmpty()}</td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const key = rowKey(row);
                const isSelected = selectedRowKey === key;
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "group transition-colors dark:border-slate-800/50",
                      onRowClick && "cursor-pointer",
                      isSelected
                        ? "bg-[#6571FF]/10 ring-1 ring-inset ring-[#6571FF]/20"
                        : cn(
                            striped && idx % 2 === 1 && "bg-[#6571FF]/[0.04]",
                            "hover:bg-[#6571FF]/[0.08] dark:hover:bg-[#6571FF]/15",
                          ),
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3",
                          rowPy,
                          alignClass(col.align),
                          col.cellClassName,
                        )}
                      >
                        {col.cell(row, idx)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with pagination */}
      {pagination && !isLoading && data.length > 0 && (
        <div className="hidden items-center justify-between border-t border-slate-100 px-3 py-2.5 dark:border-slate-800 md:flex">
          <span className="text-[11px] text-slate-400">
            Showing{" "}
            {pagination.totalItems === 0
              ? 0
              : Math.min(
                  (pagination.currentPage - 1) * pagination.pageSize + 1,
                  pagination.totalItems,
                )}
            –
            {Math.min(
              pagination.currentPage * pagination.pageSize,
              pagination.totalItems,
            )}{" "}
            of {pagination.totalItems} {pagination.itemLabel ?? "items"}
          </span>
          {pagination.totalItems > pagination.pageSize && (
            <Paginator
              current={pagination.currentPage}
              pageSize={pagination.pageSize}
              total={pagination.totalItems}
              onChange={pagination.onChange}
              pageSizeOptions={pagination.pageSizeOptions}
            />
          )}
        </div>
      )}

      {/* Mobile pagination */}
      {pagination && !isLoading && data.length > 0 && (
        <div className="mt-3 flex justify-center md:hidden">
          <Paginator
            current={pagination.currentPage}
            pageSize={pagination.pageSize}
            total={pagination.totalItems}
            onChange={pagination.onChange}
            pageSizeOptions={pagination.pageSizeOptions}
          />
        </div>
      )}
    </div>
  );
}

export type { Column, DataTableProps };

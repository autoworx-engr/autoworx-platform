import { ReactNode } from "react";

export type Density = "compact" | "cozy" | "comfy";

export type Column<T> = {
  /** Unique key, also used as React key */
  key: string;
  /** Header content */
  header: ReactNode;
  /** Cell render function — return any ReactNode */
  cell: (row: T, idx: number) => ReactNode;
  /** Tailwind width class, e.g. "w-16" */
  width?: string;
  /** Cell + header text alignment */
  align?: "left" | "center" | "right";
  /** Extra classes for the <th> */
  headerClassName?: string;
  /** Extra classes for the <td> */
  cellClassName?: string;
};

export type PaginationConfig = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onChange: (page: number, size?: number) => void;
  /** Used in "Showing 1–10 of 100 {itemLabel}" */
  itemLabel?: string;
  /** Page size options, default [10, 25, 50, 100] */
  pageSizeOptions?: number[];
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  /** Stable row key */
  rowKey: (row: T) => string | number;
  /** Pagination footer; omit to hide */
  pagination?: PaginationConfig;
  /** Optional toolbar slot rendered above the table (search, filters, etc.) */
  toolbar?: ReactNode;
  /** Mobile card render — when omitted the desktop table also shows on mobile */
  renderMobileCard?: (row: T, idx: number) => ReactNode;
  /** Row click handler — sets cursor + adds hover styles */
  onRowClick?: (row: T) => void;
  /** Highlights the matching row */
  selectedRowKey?: string | number;
  isLoading?: boolean;
  loadingComponent?: ReactNode;
  emptyMessage?: string;
  emptyState?: ReactNode;
  /** Row padding density */
  density?: Density;
  /** Tailwind height class for the scrollable area, e.g. "h-[calc(75vh-110px)]" */
  scrollHeight?: string;
  /** Striped (alternating row background) */
  striped?: boolean;
  /** Extra classes on the outer wrapper */
  className?: string;
};

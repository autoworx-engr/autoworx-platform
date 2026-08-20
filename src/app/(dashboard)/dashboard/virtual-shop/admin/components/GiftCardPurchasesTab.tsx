"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GiftCardPurchaseStats } from "./gift-card-purchases/GiftCardPurchaseStats";
import { GiftCardStatusTabs } from "./gift-card-purchases/GiftCardStatusTabs";
import { GiftCardSearchFilters } from "./gift-card-purchases/GiftCardSearchFilters";
import { GiftCardPurchaseList } from "./gift-card-purchases/GiftCardPurchaseList";
import {
  GiftCardPurchasesTabProps,
  GiftCardStatusFilter,
} from "./gift-card-purchases/types";

// Re-export types for backward compatibility or if needed by page.tsx
export type {
  IssuedGiftCardItem,
  GiftCardPurchaseSummary,
  GiftCardStatusFilter,
  GiftCardPurchasesTabProps,
} from "./gift-card-purchases/types";

export default function GiftCardPurchasesTab({
  items,
  totalRecords,
  currentPage,
  pageSize,
  search,
  status,
  startDate,
  endDate,
  summary,
}: GiftCardPurchasesTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);
  const [activeModal, setActiveModal] = useState<Record<string, boolean>>({
    dateRange: false,
  });

  const updateQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (!value) next.delete(key);
        else next.set(key, value);
      });
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const lastPushedSearchRef = useRef(search);

  useEffect(() => {
    if (search === lastPushedSearchRef.current) return;
    lastPushedSearchRef.current = search;
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === search.trim()) return;
    const timeout = setTimeout(() => {
      lastPushedSearchRef.current = trimmed;
      updateQuery({ search: trimmed || undefined, page: undefined });
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput, search, updateQuery]);

  const closeModal = (name: string) =>
    setActiveModal((p) => ({ ...p, [name]: false }));
  const toggleModal = (name: string) =>
    setActiveModal((p) => ({
      ...Object.keys(p).reduce(
        (a, k) => ({ ...a, [k]: false }),
        {} as Record<string, boolean>,
      ),
      [name]: !p[name],
    }));

  const handleStatusChange = (newStatus: GiftCardStatusFilter) => {
    updateQuery({
      status: newStatus === "ALL" ? undefined : newStatus,
      page: undefined,
    });
  };

  const handlePageChange = (page: number) => {
    updateQuery({ page: page > 1 ? String(page) : undefined });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Gift Card Purchases
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {totalRecords} purchase{totalRecords !== 1 ? "s" : ""}
            {status !== "ALL" &&
              ` · ${status.charAt(0) + status.slice(1).toLowerCase()}`}
          </p>
        </div>
      </div>

      {/* Summary KPI cards */}
      <GiftCardPurchaseStats summary={summary} />

      {/* Status filter pills */}
      <GiftCardStatusTabs
        status={status}
        summary={summary}
        onStatusChange={handleStatusChange}
      />

      {/* Search + date filter */}
      <GiftCardSearchFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        startDate={startDate}
        endDate={endDate}
        activeModal={activeModal}
        closeModal={closeModal}
        toggleModal={toggleModal}
      />

      {/* List */}
      <GiftCardPurchaseList
        items={items}
        totalRecords={totalRecords}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

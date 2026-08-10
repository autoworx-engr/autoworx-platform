import React from "react";
import { Gift } from "lucide-react";
import { Pagination } from "antd";
import { IssuedGiftCardItem } from "./types";
import { GiftCardPurchaseCard } from "./GiftCardPurchaseCard";

interface GiftCardPurchaseListProps {
  items: IssuedGiftCardItem[];
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function GiftCardPurchaseList({
  items,
  totalRecords,
  currentPage,
  pageSize,
  onPageChange,
}: GiftCardPurchaseListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500">
        <Gift size={32} className="opacity-40 mb-3" />
        <p className="text-sm font-medium">No gift card purchases found</p>
        <p className="text-xs mt-1 opacity-70">
          Try a different search term or filter
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 max-h-[54vh] overflow-y-auto thin-scrollbar pr-1">
        {items.map((item) => (
          <GiftCardPurchaseCard key={item.id} item={item} />
        ))}
      </div>

      {totalRecords > pageSize && (
        <div className="flex justify-end mt-4">
          <Pagination
            current={currentPage}
            total={totalRecords}
            pageSize={pageSize}
            showSizeChanger={false}
            onChange={onPageChange}
          />
        </div>
      )}
    </>
  );
}

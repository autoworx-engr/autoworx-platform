"use client";

import { useCallback, useEffect, useState } from "react";
import { Pagination } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterByDateRange from "@/app/(dashboard)/dashboard/reporting/components/filter/FilterByDateRange";
import {
  Search,
  Gift,
  CreditCard,
  Mail,
  Phone,
  TrendingDown,
  ShoppingBag,
  CalendarClock,
  CheckCircle2,
  MinusCircle,
  Clock,
  ShieldOff,
} from "lucide-react";

export type GiftCardStatusFilter = "ALL" | "ACTIVE" | "DEPLETED" | "EXPIRED" | "FROZEN";

export type IssuedGiftCardItem = {
  id: number;
  orderNumber: string | null;
  code: string;
  purchaserName: string;
  purchaserEmail: string;
  recipientName: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  initialBalance: number;
  currentBalance: number;
  status: "ACTIVE" | "DEPLETED" | "EXPIRED" | "FROZEN";
  deliveryMethod: "EMAIL" | "SMS" | "BOTH";
  purchaseType: string;
  scheduledSendAt: string | null;
  createdAt: string;
  template: {
    id: number;
    name: string;
    imageUrl: string;
  } | null;
  transactionCount: number;
};

export type GiftCardPurchaseSummary = {
  totalIssued: number;
  totalInitialValue: number;
  totalRemainingBalance: number;
  totalRedeemedValue: number;
  statusBreakdown: Partial<Record<"ACTIVE" | "DEPLETED" | "EXPIRED" | "FROZEN", number>>;
};

export type GiftCardPurchasesTabProps = {
  items: IssuedGiftCardItem[];
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  search: string;
  status: GiftCardStatusFilter;
  startDate?: string;
  endDate?: string;
  summary: GiftCardPurchaseSummary;
};

const STATUS_FILTERS: GiftCardStatusFilter[] = ["ALL", "ACTIVE", "DEPLETED", "EXPIRED", "FROZEN"];

function statusMeta(status: IssuedGiftCardItem["status"]) {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", icon: CheckCircle2, text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "DEPLETED":
      return { label: "Depleted", icon: MinusCircle, text: "text-slate-500", badge: "bg-slate-100 text-slate-600 border-slate-200" };
    case "EXPIRED":
      return { label: "Expired", icon: Clock, text: "text-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-200" };
    case "FROZEN":
      return { label: "Frozen", icon: ShieldOff, text: "text-rose-600", badge: "bg-rose-50 text-rose-700 border-rose-200" };
  }
}

function filterButtonClasses(filter: GiftCardStatusFilter, active: boolean) {
  if (!active) return "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600";
  switch (filter) {
    case "ACTIVE": return "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200 dark:shadow-emerald-900/30";
    case "DEPLETED": return "bg-slate-500 text-white border-slate-500 shadow-md shadow-slate-200 dark:shadow-slate-900/30";
    case "EXPIRED": return "bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-200 dark:shadow-amber-900/30";
    case "FROZEN": return "bg-rose-400 text-white border-rose-400 shadow-md shadow-rose-200 dark:shadow-rose-900/30";
    default: return "bg-[#6571FF] text-white border-[#6571FF] shadow-md shadow-indigo-200 dark:shadow-indigo-900/30";
  }
}

function GiftCardRow({ item }: { item: IssuedGiftCardItem }) {
  const meta = statusMeta(item.status);
  const StatusIcon = meta.icon;
  const redeemedAmount = item.initialBalance - item.currentBalance;
  const redemptionPercent =
    item.initialBalance > 0 ? Math.round((redeemedAmount / item.initialBalance) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Template thumbnail or fallback */}
          <div className="w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-[#6571FF] to-[#5a66ee] flex items-center justify-center shadow-sm">
            {item.template?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.template.imageUrl}
                alt={item.template.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Gift size={18} className="text-white" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">
                {item.purchaserName}
              </p>
              {item.orderNumber && (
                <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {item.orderNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {item.purchaserEmail}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${meta.badge}`}
        >
          <StatusIcon size={11} />
          {meta.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
        {/* Recipient */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
            Recipient
          </p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.recipientName}</p>
          {item.recipientEmail && (
            <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <Mail size={11} /> {item.recipientEmail}
            </p>
          )}
          {item.recipientPhone && (
            <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <Phone size={11} /> {item.recipientPhone}
            </p>
          )}
        </div>

        {/* Balance */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
            Balance
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-[#6571FF]">
              ${item.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              / ${item.initialBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6571FF] to-[#5a66ee] transition-all duration-300"
              style={{ width: `${Math.max(0, 100 - redemptionPercent)}%` }}
            />
          </div>
          {redeemedAmount > 0 && (
            <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-1">
              <TrendingDown size={11} />
              ${redeemedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} redeemed ({redemptionPercent}%)
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:col-span-2">
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <CreditCard size={11} />
            {item.deliveryMethod === "BOTH" ? "Email & SMS" : item.deliveryMethod.charAt(0) + item.deliveryMethod.slice(1).toLowerCase()}
          </span>
          {item.scheduledSendAt && (
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <CalendarClock size={11} />
              Scheduled: {new Date(item.scheduledSendAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 ml-auto">
            <ShoppingBag size={11} />
            {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}

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
  const [activeModal, setActiveModal] = useState<Record<string, boolean>>({ dateRange: false });

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

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === search.trim()) return;
    const timeout = setTimeout(() => {
      updateQuery({ search: trimmed || undefined, page: undefined });
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput, search, updateQuery]);

  const closeModal = (name: string) => setActiveModal((p) => ({ ...p, [name]: false }));
  const toggleModal = (name: string) =>
    setActiveModal((p) => ({
      ...Object.keys(p).reduce((a, k) => ({ ...a, [k]: false }), {} as Record<string, boolean>),
      [name]: !p[name],
    }));

  return (
    <div className="flex flex-col gap-5">
      {/* Header + KPI summary */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Gift Card Purchases</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {totalRecords} purchase{totalRecords !== 1 ? "s" : ""}
            {status !== "ALL" && ` · ${status.charAt(0) + status.slice(1).toLowerCase()}`}
          </p>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Issued",
            value: summary.totalIssued.toLocaleString(),
            sub: "gift cards",
            color: "text-[#6571FF]",
            bg: "bg-indigo-50 dark:bg-indigo-900/20",
          },
          {
            label: "Total Value Sold",
            value: `$${summary.totalInitialValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            sub: "initial balance",
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
          },
          {
            label: "Amount Redeemed",
            value: `$${summary.totalRedeemedValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            sub: "used so far",
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
          {
            label: "Remaining Balance",
            value: `$${summary.totalRemainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            sub: "outstanding",
            color: "text-sky-600 dark:text-sky-400",
            bg: "bg-sky-50 dark:bg-sky-900/20",
          },
        ].map(({ label, value, sub, color, bg }) => (
          <div
            key={label}
            className={`rounded-2xl border border-slate-200 dark:border-slate-700 ${bg} px-4 py-3`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
            <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const isActive = status === f;
          const count =
            f === "ALL"
              ? summary.totalIssued
              : (summary.statusBreakdown[f as keyof typeof summary.statusBreakdown] ?? 0);
          return (
            <button
              key={f}
              onClick={() =>
                updateQuery({ status: f === "ALL" ? undefined : f, page: undefined })
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${filterButtonClasses(f, isActive)}`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
              <span
                className={`px-1.5 py-px rounded-full text-[10px] font-bold ${isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + date filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search purchaser, recipient, code or order..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6571FF]/30 focus:border-[#6571FF] transition"
          />
        </div>
        <FilterByDateRange
          startDate={startDate}
          endDate={endDate}
          modalName="dateRange"
          activeModal={activeModal}
          closeModal={closeModal}
          toggleModal={toggleModal}
          queryDateFormat="yyyy-MM-dd"
        />
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500">
          <Gift size={32} className="opacity-40 mb-3" />
          <p className="text-sm font-medium">No gift card purchases found</p>
          <p className="text-xs mt-1 opacity-70">Try a different search term or filter</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-[54vh] overflow-y-auto thin-scrollbar pr-1">
            {items.map((item) => (
              <GiftCardRow key={item.id} item={item} />
            ))}
          </div>

          {totalRecords > pageSize && (
            <div className="flex justify-end">
              <Pagination
                current={currentPage}
                total={totalRecords}
                pageSize={pageSize}
                showSizeChanger={false}
                onChange={(page) =>
                  updateQuery({ page: page > 1 ? String(page) : undefined })
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

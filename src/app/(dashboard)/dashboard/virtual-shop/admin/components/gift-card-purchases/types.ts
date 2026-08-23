import { CheckCircle2, Clock, MinusCircle, ShieldOff } from "lucide-react";

export type GiftCardStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "DEPLETED"
  | "EXPIRED"
  | "FROZEN";

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
  statusBreakdown: Partial<
    Record<"ACTIVE" | "DEPLETED" | "EXPIRED" | "FROZEN", number>
  >;
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

export const STATUS_FILTERS: GiftCardStatusFilter[] = [
  "ALL",
  "ACTIVE",
  "DEPLETED",
  "FROZEN",
];

export function statusMeta(status: IssuedGiftCardItem["status"]) {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Active",
        icon: CheckCircle2,
        text: "text-emerald-600",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "DEPLETED":
      return {
        label: "Depleted",
        icon: MinusCircle,
        text: "text-slate-500",
        badge: "bg-slate-100 text-slate-600 border-slate-200",
      };
    case "EXPIRED":
      return {
        label: "Expired",
        icon: Clock,
        text: "text-amber-600",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "FROZEN":
      return {
        label: "Frozen",
        icon: ShieldOff,
        text: "text-rose-600",
        badge: "bg-rose-50 text-rose-700 border-rose-200",
      };
  }
}

export function filterButtonClasses(
  filter: GiftCardStatusFilter,
  active: boolean,
) {
  if (!active)
    return "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600";
  switch (filter) {
    case "ACTIVE":
      return "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200 dark:shadow-emerald-900/30";
    case "DEPLETED":
      return "bg-slate-500 text-white border-slate-500 shadow-md shadow-slate-200 dark:shadow-slate-900/30";
    case "EXPIRED":
      return "bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-200 dark:shadow-amber-900/30";
    case "FROZEN":
      return "bg-rose-400 text-white border-rose-400 shadow-md shadow-rose-200 dark:shadow-rose-900/30";
    default:
      return "bg-primary text-white border-primary shadow-md shadow-indigo-200 dark:shadow-indigo-900/30";
  }
}

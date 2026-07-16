import { GiftCardPurchaseSummary } from "./types";

interface GiftCardPurchaseStatsProps {
  summary: GiftCardPurchaseSummary;
}

export function GiftCardPurchaseStats({ summary }: GiftCardPurchaseStatsProps) {
  const stats = [
    {
      label: "Total Issued",
      value: summary.totalIssued.toLocaleString(),
      sub: "gift cards",
      color: "text-primary",
      bg: "bg-primary/10 dark:bg-primary/20",
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
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ label, value, sub, color, bg }) => (
        <div
          key={label}
          className={`rounded-2xl border border-slate-200 dark:border-slate-700 ${bg} px-4 py-3`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {label}
          </p>
          <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {sub}
          </p>
        </div>
      ))}
    </div>
  );
}

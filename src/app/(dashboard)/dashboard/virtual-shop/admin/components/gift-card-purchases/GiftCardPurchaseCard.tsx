import { Gift, Mail, Phone, TrendingDown } from "lucide-react";
import { IssuedGiftCardItem, statusMeta } from "./types";

interface GiftCardPurchaseCardProps {
  item: IssuedGiftCardItem;
}

export function GiftCardPurchaseCard({ item }: GiftCardPurchaseCardProps) {
  const meta = statusMeta(item.status);
  if (!meta) return null; // Should not happen with valid status
  const StatusIcon = meta.icon;
  const redeemedAmount = item.initialBalance - item.currentBalance;
  const redemptionPercent =
    item.initialBalance > 0
      ? Math.round((redeemedAmount / item.initialBalance) * 100)
      : 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Template thumbnail or fallback */}
          <div className="w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-[#5a66ee] flex items-center justify-center shadow-sm">
            {item.template?.imageUrl ? (
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
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {item.recipientName}
          </p>
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
            <span className="text-base font-bold text-primary">
              $
              {item.currentBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              / $
              {item.initialBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[#5a66ee] transition-all duration-300"
              style={{ width: `${Math.max(0, 100 - redemptionPercent)}%` }}
            />
          </div>
          {redeemedAmount > 0 && (
            <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-1">
              <TrendingDown size={11} />$
              {redeemedAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              redeemed ({redemptionPercent}%)
            </p>
          )}
        </div>

        {/* Meta */}
        {/* <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:col-span-2">
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
        </div> */}
      </div>
    </div>
  );
}

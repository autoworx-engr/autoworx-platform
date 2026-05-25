"use client";

import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";
import {
  Client,
  InventoryProduct,
  InventoryProductHistory,
  User,
  Vendor,
} from "@prisma/client";
import { DollarSign, ShoppingCart } from "lucide-react";
import { useState } from "react";
import EditSalePurchaseList from "./EditSalePurchaseList";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";

type History = InventoryProductHistory & {
  vendor: Vendor | null;
  client: Client | null;
};

export default function SalesPurchaseHistoryClient({
  user,
  product,
  histories,
  invoiceIds,
  timezone,
}: {
  user: User;
  product?: (InventoryProduct & { User: User | null }) | null;
  histories: History[];
  invoiceIds: string[];
  timezone: string;
}) {
  const [tab, setTab] = useState<"sales" | "purchase">("sales");

  const salesHistories = histories.filter((h) => h.type === "Sale");
  const purchaseHistories = histories.filter((h) => h.type === "Purchase");
  const activeHistories = tab === "sales" ? salesHistories : purchaseHistories;

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 dark:border-slate-800">
      {/* Pill tabs */}
      <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
        {[
          {
            id: "sales",
            label: "Sales",
            count: salesHistories.length,
            icon: DollarSign,
          },
          {
            id: "purchase",
            label: "Purchases",
            count: purchaseHistories.length,
            icon: ShoppingCart,
          },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as "sales" | "purchase")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
              tab === t.id
                ? "bg-[#6571FF] text-white shadow-sm shadow-[#6571FF]/30"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300",
            )}
          >
            <t.icon size={14} strokeWidth={2.5} />
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                tab === t.id
                  ? "bg-white/25 text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800",
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* History list */}
      <div className="thin-scrollbar flex-1 divide-y divide-slate-50 overflow-y-auto dark:divide-slate-800/50">
        {activeHistories.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No history found
          </p>
        ) : (
          activeHistories.map((history) => {
            const name =
              tab === "sales"
                ? `${history.client?.firstName || ""} ${history.client?.lastName || ""}`.trim()
                : history.vendor?.companyName || "";
            const price = parseFloat(history.price?.toString() ?? "0");
            const total = price * Number(history.quantity);
            const canEdit =
              !history.invoiceId &&
              (user?.employeeType === "Admin" ||
                user?.employeeType === "Manager");

            return (
              <div
                key={history.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-600 dark:text-slate-200">
                    {name || "—"}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    {history.invoiceId && tab === "sales" && (
                      <InvoiceModal
                        invoiceId={history.invoiceId}
                        buttonChild={
                          <span className="cursor-pointer text-[#6571FF]/80 font-semibold hover:underline">
                            #{history.invoiceId}
                          </span>
                        }
                      />
                    )}
                    {history.invoiceId && tab === "sales" && <span>·</span>}
                    <span>
                      {FormatUtcToTimezone(
                        history.date,
                        timezone,
                        "MM/DD/YYYY",
                      )}
                    </span>
                    {!history.invoiceId && tab === "sales" && (
                      <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-500">
                        Loss
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-100">
                      {formatCurrency(total)}
                    </p>
                    <p className="whitespace-nowrap text-[12px] text-slate-500">
                      {Number(history.quantity)} × {formatCurrency(price)}
                    </p>
                  </div>
                  {canEdit && (
                    <EditSalePurchaseList
                      productId={history.productId}
                      user={user}
                      history={history}
                      product={product!}
                      invoiceIds={invoiceIds}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

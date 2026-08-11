"use client";

import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";
import {
  Client,
  InventoryProduct,
  InventoryProductHistory,
  InventoryProductHistoryType,
  User,
  Vendor,
} from "@prisma/client";
import * as Tabs from "@radix-ui/react-tabs";
import { DollarSign, ShoppingCart, PencilLineIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import EditSalePurchaseList from "./EditSalePurchaseList";

enum Tab {
  Sales = "sales",
  Purchase = "purchase",
}

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

export default function SalesPurchaseHistoryClient({
  user,
  product,
  histories,
  invoiceIds,
  timezone,
}: {
  user: User;
  product?: (InventoryProduct & { User: User | null }) | null | undefined;
  histories: (InventoryProductHistory & {
    vendor: Vendor | null;
    client: Client | null;
  })[];
  invoiceIds: string[];
  timezone: string;
}) {
  const [tab, setTab] = useState<Tab>(Tab.Sales);

  const searchParams = useSearchParams();

  const view = searchParams?.get("view");

  return (
    <div className="app-shadow mt-4 flex-1 min-h-[300px] lg:min-h-0 overflow-y-auto rounded-lg bg-background p-4">
      <Tabs.Root value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <Tabs.List className="w-fit flex gap-3 items-center p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 shadow-sm">
          <Tabs.Trigger
            value={Tab.Sales}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-lg px-4 py-2 text-sm 2xl:text-lg font-medium transition-all duration-300",
              tab === Tab.Sales
                ? "text-white shadow-md shadow-indigo-500/25 ring-1 ring-black/5 translate-y-[-1px] bg-gradient-to-r from-primary to-[#5a66ee]"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200",
            )}
          >
            <DollarSign
              size={18}
              strokeWidth={2.5}
              className={cn(
                "transition-colors duration-300",
                tab === Tab.Sales
                  ? "text-white"
                  : "text-slate-500 group-hover:text-primary",
              )}
            />
            <span className="whitespace-nowrap">
              {view === "products" ? "Sales List" : "Use List"}
            </span>
          </Tabs.Trigger>
          <Tabs.Trigger
            value={Tab.Purchase}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-lg px-4 py-2 text-sm 2xl:text-lg font-medium transition-all duration-300",
              tab === Tab.Purchase
                ? "text-white shadow-md shadow-indigo-500/25 ring-1 ring-black/5 translate-y-[-1px] bg-gradient-to-r from-primary to-[#5a66ee]"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200",
            )}
          >
            <ShoppingCart
              size={18}
              strokeWidth={2.5}
              className={cn(
                "transition-colors duration-300",
                tab === Tab.Purchase
                  ? "text-white"
                  : "text-slate-500 group-hover:text-primary",
              )}
            />
            <span className="whitespace-nowrap">Purchase List</span>
          </Tabs.Trigger>
        </Tabs.List>
        <div className="mt-3">
          <Tabs.Content value={Tab.Sales}>
            <Table
              histories={histories.filter((history) => history.type === "Sale")}
              type="Sale"
              product={product}
              user={user}
              invoiceIds={invoiceIds}
              timezone={timezone}
            />
          </Tabs.Content>
          <Tabs.Content value={Tab.Purchase}>
            <Table
              histories={histories.filter(
                (history) => history.type === "Purchase",
              )}
              user={user}
              type="Purchase"
              product={product}
              timezone={timezone}
            />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}

function Table({
  user,
  histories,
  type,
  product,
  invoiceIds,
  timezone,
}: {
  user: User;
  histories: (InventoryProductHistory & {
    vendor: Vendor | null;
    client: Client | null;
  })[];
  type: InventoryProductHistoryType;
  product?: (InventoryProduct & { User: User | null }) | null | undefined;
  invoiceIds?: string[];
  timezone: string;
}) {
  const searchParams = useSearchParams();
  const view = searchParams?.get("view");

  const shouldShowActions =
    !(type === "Sale" && view === "products") &&
    (user?.employeeType === "Admin" || user?.employeeType === "Manager");
  return (
    <div className="w-full">
      {/* Desktop Table (Hidden on Mobile) */}
      <table className="hidden w-full text-sm md:table 2xl:text-base">
        <thead className="bg-background">
          <tr className="h-10 border-b">
            {product?.type === "Product" && (
              <th className="text-center">
                {type === "Sale" ? "Invoice" : "Receipt"}
              </th>
            )}
            <th className="text-center">Name</th>
            <th className="text-center">Price</th>
            <th className="text-center">Quantity</th>
            <th className="text-center">Total</th>
            <th className="text-center">Date</th>
            {!(view === "products" && type === "Sale") &&
              (user?.employeeType === "Admin" ||
                user?.employeeType === "Manager") && (
                <th className="text-center">Action</th>
              )}
          </tr>
        </thead>
        <tbody>
          {histories.map((history, index) => (
            <tr
              key={history.id}
              className={cn("py-3", index % 2 === 0 ? evenColor : oddColor)}
            >
              {product?.type === "Product" && (
                <td className="text-center text-primary">
                  {type === "Sale" ? (
                    history.invoiceId ? (
                      <InvoiceModal
                        invoiceId={history.invoiceId}
                        buttonChild={<button>{history.invoiceId}</button>}
                      />
                    ) : (
                      <p className="text-red-500">--- Loss ---</p>
                    )
                  ) : (
                    <p>{product.receipt}</p>
                  )}
                </td>
              )}
              <td className="text-center">
                {type === "Sale"
                  ? history.client?.firstName || history.client?.lastName
                  : history.vendor?.companyName}
              </td>
              <td className="text-center">
                $
                {history.price
                  ? parseFloat(history.price.toString()).toFixed(2)
                  : "0.00"}
              </td>
              <td className="text-center">{Number(history.quantity)}</td>
              <td className="text-center">
                {formatCurrency(
                  parseFloat(history.price?.toString() ?? "0") *
                    parseFloat(history.quantity?.toString() ?? "0"),
                )}
              </td>
              <td className="text-center">
                {FormatUtcToTimezone(history.date, timezone, "MM/DD/YYYY")}
              </td>
              {(user?.employeeType === "Admin" ||
                user?.employeeType === "Manager") && (
                <td className="text-center">
                  {history.invoiceId ? (
                    // <EditSalesList
                    // productId={history.productId}
                    // invoiceIds={[history.invoiceId]}
                    // cost={parseInt(history?.price?.toString() || "0")}
                    // productType={product?.type || "Product"}
                    // history = {history}
                    // />
                    <></>
                  ) : (
                    <EditSalePurchaseList
                      productId={history.productId}
                      user={user}
                      history={history}
                      product={product!}
                      invoiceIds={invoiceIds}
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Card View (Hidden on Desktop) */}
      <div className="space-y-4 md:hidden">
        {histories.map((history, index) => {
          const isSale = type === "Sale";
          const total =
            parseFloat(history.price?.toString() ?? "0") *
            parseFloat(history.quantity?.toString() ?? "0");

          // Determine the record's main contact name
          const contactName = isSale
            ? history.client?.firstName
            : history.vendor?.name;

          return (
            <div
              key={history.id}
              className={cn(
                "rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-shadow duration-200",
                index % 2 === 0 ? evenColor : oddColor,
                "hover:shadow-md dark:bg-slate-900/50", // Added dark mode and hover effect
              )}
            >
              {/* Row 1: Type / Reference ID & Date */}
              <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-2 mb-2 dark:border-slate-700">
                {/* Reference Link/Status */}
                <div className="text-sm font-semibold">
                  {product?.type === "Product" &&
                  isSale &&
                  history.invoiceId ? (
                    <Link
                      href={`/dashboard/estimate/view/${history.invoiceId}`}
                      className="text-primary hover:underline"
                    >
                      {history.invoiceId}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-medium px-3 py-0.5 rounded-full",
                          isSale
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700",
                        )}
                      >
                        {isSale ? "SALE" : "PURCHASE"}
                      </span>
                      {shouldShowActions && (
                        <div>
                          {/* Check 1: If it's a Purchase (not Sale) AND has an Invoice ID, link to edit the Invoice */}
                          {!isSale && history.invoiceId ? (
                            <Link
                              href={`/dashboard/estimate/edit/${history.invoiceId}?clientId=${history.client?.id}`}
                              className="text-primary hover:text-indigo-500 transition-colors"
                            >
                              <PencilLineIcon className="h-4 w-4" />
                            </Link>
                          ) : (
                            // Check 2: Otherwise, show the inline Edit/Delete component
                            <EditSalePurchaseList
                              productId={history.productId}
                              user={user}
                              history={history}
                              product={product!}
                              invoiceIds={invoiceIds}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {FormatUtcToTimezone(history.date, timezone, "MM/DD/YYYY")}
                </div>
              </div>

              {/* Row 2: Contact Name */}
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  {isSale ? "Client" : "Vendor"} Name:
                </span>
                <span className="font-bold text-slate-600 dark:text-slate-200">
                  {contactName ?? "N/A"}
                </span>
              </div>

              {/* Row 3: Price */}
              <div className="flex justify-between items-center mt-2">
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  Price:
                </span>
                <span className="text-lg font-semibold text-slate-600 dark:text-white">
                  {formatCurrency(parseFloat(history.price?.toString() ?? "0"))}
                </span>
              </div>

              {/* Row 4: Quantity */}
              <div className="flex justify-between items-center -mt-1 text-sm">
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  Quantity:
                </span>
                <span className="font-bold text-slate-600 dark:text-slate-200">
                  {Number(history.quantity)}
                </span>
              </div>

              {/* Row 5: Total */}
              <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-2 mt-2 dark:border-slate-700">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Total:
                </span>
                <span className="font-bold text-lg text-slate-600 dark:text-white">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

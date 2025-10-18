"use client";

import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  Client,
  InventoryProduct,
  InventoryProductHistory,
  InventoryProductHistoryType,
  User,
  Vendor,
} from "@prisma/client";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import EditSalePurchaseList from "./EditSalePurchaseList";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";
import { SquarePen } from "lucide-react";

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
    <div className="app-shadow mt-4 block min-h-[300px] w-full overflow-y-auto rounded-lg bg-background p-4 lg:max-h-[52%] lg:min-h-[52%]">
      <Tabs.Root value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <Tabs.List className="flex gap-5">
          <Tabs.Trigger
            value={Tab.Sales}
            className={cn(
              "rounded-md p-2 px-5 text-sm 2xl:text-lg",
              tab === Tab.Sales
                ? "bg-[#6571FF] text-white"
                : "border border-[#6571FF] text-[#6571FF]"
            )}
          >
            {/* Use List */}
            {view === "products" ? "Sales List" : "Use List"}
          </Tabs.Trigger>
          <Tabs.Trigger
            value={Tab.Purchase}
            className={cn(
              "rounded-md p-2 px-5 text-sm 2xl:text-lg",
              tab === Tab.Purchase
                ? "bg-[#6571FF] text-white"
                : "border border-[#6571FF] text-[#6571FF]"
            )}
          >
            Purchase List
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
                (history) => history.type === "Purchase"
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
                <td className="text-center text-[#6571FF]">
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
                  parseFloat(
                    (
                      parseFloat(history.price?.toString() ?? "0") *
                      Number(history.quantity)
                    ).toFixed(2)
                  )
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
        {histories.map((history, index) => (
          <div
            key={history.id}
            className={cn(
              "rounded-lg border border-[#BFC4FF] p-4 shadow-sm",
              index % 2 === 0 ? evenColor : oddColor
            )}
          >
            <div className="flex items-center justify-between">
              {product?.type === "Product" && (
                <div className="flex justify-between">
                  {/* <span className="font-medium">
                  {type === "Sale" ? "Invoice" : "Receipt"}:
                </span> */}
                  {type === "Sale" && history.invoiceId ? (
                    <Link
                      href={`/dashboard/estimate/view/${history.invoiceId}`}
                      className="text-[#6571FF]"
                    >
                      {history.invoiceId}
                    </Link>
                  ) : (
                    <span className="hidden text-red-500 md:block">
                      --- Loss ---
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                {/* <span className="font-medium">Date:</span> */}
                <span>
                  {FormatUtcToTimezone(history.date, timezone, "MM/DD/YYYY")}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Name:</span>
              <span className="font-bold">
                {type === "Sale"
                  ? history.client?.firstName
                  : history.vendor?.name}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium">Price:</span>
              <span className="text-[20px] font-bold">
                ${history.price?.toString()}
              </span>
            </div>
            <div className="-mt-[6px] flex justify-between">
              <span className="font-medium">Quantity:</span>
              <span className="font-bold">{Number(history.quantity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total:</span>
              <span className="font-bold">
                {formatCurrency(
                  parseFloat(history.price?.toString() ?? "0") *
                    Number(history.quantity)
                )}
              </span>
            </div>

            {shouldShowActions && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Action:</span>
                {type !== "Sale" && history.invoiceId ? (
                  <Link
                    href={`/dashboard/estimate/edit/${history.invoiceId}?clientId=${history.client?.id}`}
                    className="text-[#6571FF]"
                  >
                    <SquarePen className="mt-1 h-4 w-4" />
                  </Link>
                ) : (
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
        ))}
      </div>
    </div>
  );
}

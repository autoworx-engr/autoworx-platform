import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { formatCurrency } from "@/utils/formatCurrency";
import { Category, InventoryProduct, Vendor } from "@prisma/client";
import { QrCode } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import EditProduct from "./EditProduct";
import ReplenishProductForm from "./ReplenishProductForm";
import SalesPurchaseHistory from "./SalesPurchaseHistory";
import SidebarCloseButton from "./SidebarCloseButton";
import UseProductForm from "./UseProductForm";

const SWATCH_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
];
function getSwatchColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SWATCH_COLORS[Math.abs(hash) % SWATCH_COLORS.length];
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-4">
      <span className="text-sm font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <span className="text-base font-bold text-slate-500 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

export default async function Sidebar({
  productId,
  hidden = false,
}: {
  productId: number;
  hidden?: boolean;
}) {
  const companyId = await getCompanyId();
  const user = await getUser();

  const product = productId
    ? await db.inventoryProduct.findUnique({
        where: { id: productId },
        include: { category: true, vendor: true },
      })
    : null;

  const imgUrl = product
    ? await QRCode.toDataURL(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/inventory/use/${product.id}`,
      )
    : null;

  const invoices = await db.invoice.findMany({
    where: { companyId, type: "Invoice" },
    select: {
      id: true,
      client: { select: { firstName: true, lastName: true } },
    },
  });
  const invoiceIds = invoices.map((i) => i.id);
  const invoiceWithClient = invoices.map((i) => ({
    id: i.id,
    clientName: `${i.client?.firstName} ${i.client?.lastName}`,
  }));

  const qty = Number(product?.quantity || 0);
  const price = parseFloat(product?.price?.toString() || "0");
  const alert = Number(product?.lowInventoryAlert || 0);
  const isOutOfStock = qty === 0;
  const isLow = !isOutOfStock && qty <= alert;

  const isAdmin =
    user.employeeType === "Admin" || user.employeeType === "Manager";

  return (
    <div
      className={`mt-0 md:mt-12 ${
        hidden ? "hidden" : !!productId ? "flex" : "hidden lg:flex"
      } h-fit lg:h-[79.5vh] w-full lg:w-[460px] lg:flex-none flex-col`}
    >
      {product ? (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#6571FF]" />
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-200">
                Product details
              </span>
            </div>
            <div className="flex items-center gap-1">
              <EditProduct
                productData={
                  product as InventoryProduct & {
                    category: Category;
                    vendor: Vendor;
                  }
                }
              />
              <SidebarCloseButton />
            </div>
          </div>

          {/* Product card */}
          <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-slate-600 dark:text-slate-100">
                {product.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    Out of stock
                  </span>
                ) : isLow ? (
                  <span className="inline-flex min-w-20 justify-center items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-500 dark:bg-amber-950/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Low stock
                  </span>
                ) : (
                  <span className="inline-flex min-w-20 justify-center items-center gap-1 rounded-full bg-[#6571FF]/5 px-2 py-0.5 text-[12px] font-semibold text-[#6571FF]/80 dark:bg-[#6571FF]/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#6571FF]/80" />
                    In stock
                  </span>
                )}
                {product.category?.name && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {product.category.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats 2×2 grid */}
          <div className="grid flex-shrink-0 grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            <StatCell
              label="On Hand"
              value={`${qty} ${product.unit || "pcs"}`}
            />
            <StatCell label="Unit Price" value={formatCurrency(price)} />
            <StatCell
              label="Reorder At"
              value={alert ? `${alert} ${product.unit || "pcs"}` : "—"}
            />
            <StatCell label="Stock Value" value={formatCurrency(price * qty)} />
          </div>

          {/* QR + Quick Adjust */}
          <div className="flex flex-shrink-0 items-start gap-4 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
              {imgUrl ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-lg">
                  <Image
                    src={imgUrl}
                    alt="QR Code"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <QrCode size={32} />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Quick Adjust
              </span>
              {isAdmin && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <UseProductForm
                      productId={productId}
                      invoiceIds={invoiceWithClient}
                      cost={price}
                      productType={product.type}
                    />
                    <ReplenishProductForm
                      lastUnit={product.unit}
                      productId={productId}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* History (fills remaining space) */}
          <SalesPurchaseHistory
            user={user}
            productId={productId}
            invoiceIds={invoiceIds}
          />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm text-slate-400">
            Select a product to view details
          </p>
        </div>
      )}
    </div>
  );
}

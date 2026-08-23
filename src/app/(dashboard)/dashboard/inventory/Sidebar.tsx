import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { formatCurrency } from "@/utils/formatCurrency";

// Remove .00 from currency unless there's a decimal value
const formatCurrencyClean = (value: number): string => {
  const formatted = formatCurrency(value);
  return formatted.replace(/\.00(?=\s|$)/g, "");
};
import { CircleAlert } from "lucide-react";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import QRCode from "qrcode";
import EditProduct from "./EditProduct";
import ProductTooltipContainer from "./ProductTooltipContainer";
import QRcode from "./QRcode";
import ReplenishProductForm from "./ReplenishProductForm";
import SalesPurchaseHistory from "./SalesPurchaseHistory";
import UseProductForm from "./UseProductForm";

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
    ? await db.inventoryProduct.findUnique({ where: { id: productId } })
    : null;

  const imgUrl = product
    ? await unstable_cache(
        () =>
          QRCode.toDataURL(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/inventory/use/${product.id}`,
          ),
        [`inventory-qr-${product.id}`],
        { revalidate: 86400 },
      )()
    : null;

  const invoices = await db.invoice.findMany({
    where: { companyId, type: "Invoice" },
    select: {
      id: true,
      client: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const isWarningForQuantity =
    product &&
    Number(product.quantity || 0) <= Number(product.lowInventoryAlert || 1);

  const invoiceIds = invoices.map((invoice) => invoice.id);
  const invoiceWithClient = invoices.map((invoice) => ({
    id: invoice.id,
    clientName: `${invoice.client?.firstName} ${invoice.client?.lastName}`,
  }));

  return (
    <div
      className={`mt-3 ${
        hidden ? "hidden" : !!productId ? "flex" : "hidden lg:flex"
      }  h-fit lg:h-[calc(83vh-2.25rem)] w-full mx-auto flex-col md:mt-12 lg:w-1/2`}
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* LEFT COLUMN: Financial Metrics */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-4 lg:w-1/3 xl:w-1/4">
          {/* Total Value Card */}
          <div className="group relative flex-1 flex items-center justify-center overflow-hidden rounded-2xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-950 dark:ring-slate-800">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="relative z-10 flex flex-col my-auto items-center justify-center space-y-2 text-center w-full min-w-0">
              <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wider text-slate-500 flex-shrink-0">
                Total Value
              </h3>
              <div className="w-full min-w-0">
                {product && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="block truncate text-xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300 cursor-default"
                          title={formatCurrency(
                            parseFloat(product.price?.toString() || "0") *
                              parseFloat(product.quantity?.toString() || "0"),
                          )}
                        >
                          {formatCurrencyClean(
                            parseFloat(product.price?.toString() || "0") *
                              parseFloat(product.quantity?.toString() || "0"),
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-white border-none shadow-xl">
                        <p>
                          {formatCurrency(
                            parseFloat(product.price?.toString() || "0") *
                              parseFloat(product.quantity?.toString() || "0"),
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>

          {/* Unit Price Card */}
          <div className="group relative flex-1 flex items-center justify-center overflow-hidden rounded-2xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-950 dark:ring-slate-800">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-slate-900 dark:to-slate-900" />

            <div className="relative z-10 flex flex-col items-center justify-center space-y-2 text-center w-full">
              <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wider text-slate-500 flex-shrink-0">
                Unit Price
              </h3>
              <div className="flex items-baseline justify-center gap-0.5 w-full min-w-0">
                <span className="min-w-0">
                  {product && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="block truncate text-lg sm:text-2xl font-bold text-slate-700 dark:text-slate-200 cursor-default"
                            title={formatCurrency(
                              parseFloat(product.price?.toString() || "0"),
                            )}
                          >
                            {formatCurrencyClean(
                              parseFloat(product.price?.toString() || "0"),
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 text-white border-none">
                          <p>
                            {formatCurrency(
                              parseFloat(product.price?.toString() || "0"),
                            )}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </span>
                <span className="text-xs sm:text-sm font-medium text-slate-400 flex-shrink-0">
                  /{product?.unit || "unit"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Inventory Details & Actions */}
        <div className="flex-1 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-950 dark:ring-slate-800">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            {/* Details Section */}
            <div className="col-span-1 md:col-span-7 lg:col-span-8 flex flex-col justify-center space-y-6 min-w-0">
              <div className="space-y-4 border p-2 rounded-lg min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100 flex-shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00b8b0] flex-shrink-0"></span>
                    <span className="truncate">Inventory Details</span>
                  </h3>
                  {/* Mobile Edit Trigger */}
                  {product && (
                    <div className="md:hidden flex-shrink-0">
                      <EditProduct productData={product as any} />
                    </div>
                  )}
                </div>

                <div className="grid gap-y-4 text-sm min-w-0">
                  {/* Name */}
                  <div className="grid grid-cols-3 gap-1 sm:gap-4 px-2 min-w-0">
                    <span className="font-medium text-slate-500 flex-shrink-0">
                      Name
                    </span>
                    <div className="col-span-2 font-medium text-slate-700 dark:text-slate-300 min-w-0">
                      {product && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="block truncate cursor-default"
                                title={product.name || ""}
                              >
                                {product.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{product.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {/* Type */}
                  <div className="grid grid-cols-3 gap-1 sm:gap-4 border-y p-2 min-w-0">
                    <span className="font-medium text-slate-500 flex-shrink-0">
                      Type
                    </span>
                    <div className="col-span-2 min-w-0">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200 truncate">
                        {product && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="cursor-default truncate"
                                  title={product.type || ""}
                                >
                                  {product.type}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{product.type}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4 px-2 min-w-0">
                    <span className="font-medium text-slate-500 flex-shrink-0">
                      Description
                    </span>
                    <div className="col-span-2 text-slate-600 dark:text-slate-400 min-w-0">
                      {product && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="block truncate leading-relaxed cursor-default"
                                title={
                                  product.description ||
                                  "No description available."
                                }
                              >
                                {product.description ||
                                  "No description available."}
                              </span>
                            </TooltipTrigger>
                            {product.description && (
                              <TooltipContent className="max-w-xs p-3">
                                <p>{product.description}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              {product &&
                (user.employeeType === "Admin" ||
                  user.employeeType === "Manager") && (
                  <div className="flex w-full flex-col gap-2">
                    <div className="flex w-full items-center justify-center gap-2 rounded-lg dark:bg-slate-900">
                      <div className="grid w-full grid-cols-2 gap-2">
                        <div className="w-full [&>button]:w-full">
                          <UseProductForm
                            productId={productId}
                            invoiceIds={invoiceWithClient}
                            cost={parseFloat(product.price?.toString() || "0")}
                            productType={product.type}
                          />
                        </div>
                        <div className="w-full [&>button]:w-full">
                          <ReplenishProductForm
                            lastUnit={product.unit}
                            productId={productId}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* Right Side: QR & Quantity & Actions */}
            {product && (
              <div className="col-span-1 md:col-span-5 lg:col-span-4 flex flex-col items-center justify-between gap-6 border-t border-slate-100 pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0 dark:border-slate-800">
                {/* Quantity Display */}
                <div className="relative w-full rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center dark:border-slate-800 dark:bg-slate-900/50 min-w-0">
                  {isWarningForQuantity && (
                    <div className="absolute right-2 top-2 animate-pulse flex-shrink-0">
                      <CircleAlert size={18} className="text-amber-500" />
                    </div>
                  )}

                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Stock Level
                  </div>

                  <div className="mt-1 flex items-center justify-center w-full min-w-0">
                    <ProductTooltipContainer product={product} />
                  </div>
                </div>

                {/* QR Code */}
                {product && (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="group relative rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 transition-all hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800">
                      {imgUrl ? (
                        <div className="relative h-32 w-32 overflow-hidden rounded-lg flex-shrink-0">
                          <Image
                            src={imgUrl}
                            alt="QR Code"
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <QRcode imgUrl={imgUrl!} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <SalesPurchaseHistory
        user={user}
        productId={productId}
        invoiceIds={invoiceIds}
      />
    </div>
  );
}

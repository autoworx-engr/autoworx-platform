import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";
import { cn } from "@/lib/cn";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { formatCurrency } from "@/utils/formatCurrency";
import { env } from "next-runtime-env";
import Image from "next/image";
import QRCode from "qrcode";
import { FaCircleExclamation } from "react-icons/fa6";
import EditProduct from "./EditProduct";
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
  // Find the last history for this product
  // const lastHistory = productId
  //   ? await db.inventoryProductHistory.findFirst({
  //       where: { productId },
  //       orderBy: { date: "desc" },
  //     })
  //   : null;

  const imgUrl = product
    ? await QRCode.toDataURL(
        `${env("NEXT_PUBLIC_APP_URL")}/dashboard/inventory/use/${product.id}`
      )
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
        hidden ? "hidden" : !!productId ? "flex" : "hidden md:flex"
      }  h-fit lg:h-full w-fit mx-auto flex-col overflow-y-scroll md:mt-12 md:w-1/2`}
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex flex-col justify-between px-5 md:px-0">
          <div className="app-shadow rounded-lg bg-background px-6 py-2 2xl:py-6">
            <div className="#h-16 #w-32 px-2 py-3 md:py-0 2xl:p-4">
              <h3 className="text-md text-nowrap text-center font-semibold 2xl:text-2xl">
                Total Value
              </h3>
              <p className="mt-2 text-center text-2xl font-bold 2xl:text-4xl">
                {product && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default text-3xl">
                          {(() => {
                            const totalPrice =
                              parseFloat(product.price?.toString() || "0") *
                              parseFloat(product.quantity?.toString() || "0");

                            const totalStr = totalPrice.toLocaleString(); // comma separated

                            // Shorten display if too long
                            return totalStr.length > 6
                              ? totalStr.slice(0, 6) + ".."
                              : totalStr;
                          })()}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {formatCurrency(
                            parseFloat(product.price?.toString() || "0") *
                              parseFloat(product.quantity?.toString() || "0")
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </p>
            </div>
          </div>
          <div className="app-shadow mt-4 rounded-lg bg-background p-6 px-6">
            <div className="#h-16 #w-32 px-2 py-0 2xl:p-4">
              <h3 className="text-md text-center font-semibold 2xl:text-2xl">
                Price
              </h3>
              <p className="mt-2 text-nowrap text-center text-2xl font-bold 2xl:text-3xl">
                {product && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default text-3xl">
                          {(() => {
                            const price = parseFloat(
                              product.price?.toString() || "0"
                            );
                            const priceStr = price.toLocaleString(); // comma separated

                            return priceStr.length > 6
                              ? priceStr.slice(0, 6) + ".."
                              : priceStr;
                          })()}
                          <span className="text-base">/{product.unit}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {formatCurrency(
                            parseFloat(product.price?.toString() || "0")
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="app-shadow mb-2 w-full rounded-lg bg-[#F8F9FA] p-4 text-xs md:mb-0 md:bg-background 2xl:text-base">
          <div className="grid grid-cols-1 gap-0  lg:grid-cols-5 md:gap-10">
            <div className="order-2 col-span-2 px-[10px] py-1 md:order-1 md:px-0 md:py-0">
              <h3 className="hidden text-lg font-semibold md:block text-nowrap">
                Inventory Details
              </h3>

              <p className="mt-2">
                <span className="font-semibold">Name: </span>{" "}
                {product && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">
                          {product.name?.length > 20
                            ? product.name.slice(0, 20) + "..."
                            : product.name}
                        </span>
                      </TooltipTrigger>
                      {product.name?.length > 20 && (
                        <TooltipContent>
                          <p>{product.name}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </p>

              <p className="mt-2">
                <span className="font-semibold">Type: </span>{" "}
                {product && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">
                          {product.type?.length > 20
                            ? product.type.slice(0, 20) + "..."
                            : product.type}
                        </span>
                      </TooltipTrigger>
                      {product.type?.length > 20 && (
                        <TooltipContent>
                          <p>{product.type}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </p>

              <p className="mt-2 text-justify">
                <span className="font-semibold">Description: </span>{" "}
                {product && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">
                          {product.description &&
                          product.description.length > 80
                            ? product.description.slice(0, 80) + "..."
                            : product.description}
                        </span>
                      </TooltipTrigger>
                      {product.description &&
                        product.description.length > 80 && (
                          <TooltipContent className="max-w-xs">
                            <p>{product.description}</p>
                          </TooltipContent>
                        )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </p>
            </div>

            {product && (
              <div className="order-1 col-span-3 grid grid-cols-2 md:order-2 md:gap-10">
                {/* qr code */}
                <div className="block md:hidden">
                  <div>
                    {imgUrl && (
                      //  eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgUrl}
                        alt="qr code"
                        className="mx-auto h-40 w-40 rounded-lg border border-gray-500 p-0.5"
                      />
                    )}
                  </div>
                  {/* <button
                      className="mx-auto mt-3 flex w-fit items-center gap-1 rounded-md border border-slate-400 p-1 px-3"
                    >
                      <FaPrint className="text-sm" />
                      Print
                    </button> */}
                  <QRcode imgUrl={imgUrl!} />
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="relative hidden text-nowrap rounded-lg border p-4 text-center font-semibold md:block">
                    {isWarningForQuantity && (
                      <div className="absolute right-2 top-2">
                        <FaCircleExclamation className="text-2xl text-red-600" />
                      </div>
                    )}
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "text-3xl cursor-default",
                                Number(product.quantity) === 0 && "text-red-600"
                              )}
                            >
                              {String(product.quantity).length > 4
                                ? String(product.quantity).slice(0, 4) + ".."
                                : Number(product.quantity)}
                            </span>
                          </TooltipTrigger>
                          {String(product.quantity).length > 4 && (
                            <TooltipContent>
                              <p>{Number(product.quantity)}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>

                      <span className="truncate">
                        /
                        {product.unit ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default">
                                  {product.unit.length > 5
                                    ? product.unit.slice(0, 5) + "..."
                                    : product.unit}
                                </span>
                              </TooltipTrigger>
                              {product.unit.length > 5 && (
                                <TooltipContent>
                                  <p>{product.unit}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          "-"
                        )}
                      </span>
                    </div>
                    <span>Remaining</span>
                  </div>
                  {(user.employeeType === "Admin" ||
                    user.employeeType === "Manager") && (
                    <div className="mt-3 flex flex-col space-y-2">
                      <button className="flex items-center justify-center rounded-md border px-2 py-1 text-center text-[12px] md:hidden">
                        <EditProduct productData={product as any} />
                      </button>
                      <UseProductForm
                        productId={productId}
                        invoiceIds={invoiceWithClient}
                        cost={parseFloat(product.price?.toString() || "0")} // This should still work
                        productType={product.type}
                      />
                      <ReplenishProductForm
                        lastUnit={product.unit}
                        productId={productId}
                      />
                    </div>
                  )}
                </div>
                {/* qr code */}
                <div className="hidden md:block">
                  <div>
                    {imgUrl && (
                      <Image
                        src={imgUrl}
                        alt="qr code"
                        className="mx-auto h-40 w-40 rounded-lg border border-gray-500 p-0.5"
                        width={160}
                        height={160}
                      />
                    )}
                  </div>
                  {/* <button
                      className="mx-auto mt-3 flex w-fit items-center gap-1 rounded-md border border-slate-400 p-1 px-3"
                    >
                      <FaPrint className="text-sm" />
                      Print
                    </button> */}
                  <QRcode imgUrl={imgUrl!} />
                </div>
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

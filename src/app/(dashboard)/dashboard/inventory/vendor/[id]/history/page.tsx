import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import BackButton from "@/components/BackButton";
import EditVendor from "@/components/Lists/EditVendor";
import Title from "@/components/Title";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  Building2,
  DollarSign,
  Edit,
  Globe,
  Hash,
  Mail,
  PencilLineIcon,
  Phone,
  User,
} from "lucide-react";
import moment from "moment-timezone";
import { Metadata } from "next";
import Link from "next/link";

// --- STYLES DEFINITION ---
const evenColor = "bg-white dark:bg-slate-800";
const oddColor = "bg-slate-50 dark:bg-slate-800/80";
const ACCENT_COLOR = "#6571FF";
const TRANSITION_UTILITY = "transition-all duration-300 ease-in-out";
const BASE_TEXT_COLOR = "text-slate-600 dark:text-white";
const INFO_TEXT_COLOR = "text-slate-500 dark:text-slate-400";
// --- END STYLES DEFINITION ---

const DetailRow = ({
  icon: Icon,
  label,
  value,
  isLink = false,
  type = "text",
  linkPrefix = "",
}: {
  icon: any;
  label: string;
  value: string;
  isLink?: boolean;
  type?: string;
  linkPrefix?: string;
}) => {
  if (!value) return null;

  let displayValue = value;
  let href = isLink ? `${linkPrefix}${value}` : undefined;

  if (type === "web" && value && !value.startsWith("http")) {
    href = `http://${value}`;
  }

  const valueElement = isLink ? (
    <Link
      href={href || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "break-all max-w-[250px] font-medium",
        type === "tel"
          ? "text-emerald-500 hover:text-emerald-400"
          : "text-blue-500 hover:text-blue-400",
        TRANSITION_UTILITY,
      )}
    >
      {displayValue}
    </Link>
  ) : (
    <span className={`font-medium ${BASE_TEXT_COLOR}`}>{displayValue}</span>
  );

  return (
    <div className="flex items-start gap-2 text-sm">
      {Icon && (
        <Icon
          size={16}
          className={`mt-0.5 min-w-[16px] text-slate-500 dark:text-slate-400`}
        />
      )}
      <span
        className={`min-w-[100px] text-left font-medium ${INFO_TEXT_COLOR}`}
      >
        {label}:
      </span>
      {valueElement}
    </div>
  );
};

export const metadata: Metadata = {
  title: "Inventory - Vendor Purchase History",
  description: "View purchase history and details for a vendor.",
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  const { id } = params;

  const { timezone } = await getCompanyTimezone();

  // Data fetching logic (omitted for brevity, assume `vendor`, `vendorTransactions`, `totalPurchaseAmount` are populated)
  const vendor = await db.vendor.findUnique({
    where: { id: parseInt(id) },
    include: { inventoryProducts: true },
  });
  const vendorTransactions = await db.inventoryProductHistory.findMany({
    where: { vendorId: parseInt(id), type: "Purchase" },
    include: { product: true },
    orderBy: { date: "desc" },
  });
  const totalPurchaseAmount = vendorTransactions.reduce(
    (sum, t) => sum + Number(t.price) * Number(t.quantity),
    0,
  );
  // End Data fetching logic

  return (
    <div className="h-full px-4 sm:px-6 lg:px-8">
      {" "}
      {/* Added padding for better page spacing */}
      {/* 1. Header & Back Button */}
      <Title
        className={`flex items-center gap-2 ${BASE_TEXT_COLOR} text-xl lg:text-2xl font-bold mb-4 mt-2`}
      >
        <BackButton href={`/dashboard/inventory/vendor?vendorId=${id}`} />
        Purchase History for {vendor?.name}
      </Title>
      <div className="mt-2 flex h-full flex-col-reverse gap-8 lg:flex-row">
        {/* 2. Main Content: Transactions Table (Desktop) / Cards (Mobile) */}
        <div
          // Refined Container: Shadow, border, dark mode background
          className="h-[90%] w-full border overflow-hidden rounded-xl hidden lg:block lg:w-[70%]"
        >
          <div
            className={`h-full overflow-auto thin-scrollbar rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-800 shadow-xl ${TRANSITION_UTILITY}`}
          >
            {/* Transactions Table (Desktop) */}
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/50 z-10">
                <tr className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left w-[5%]">#</th>
                  <th className="px-6 py-3 text-left w-[30%]">Product Name</th>
                  <th className="px-6 py-3 text-left w-[15%]">Price</th>
                  <th className="px-6 py-3 text-left w-[10%]">Quantity</th>
                  <th className="px-6 py-3 text-left w-[15%]">Total</th>
                  <th className="px-6 py-3 text-left w-[15%]">Date</th>
                  <th className="px-4 py-3 text-left w-[10%]">Receipt</th>
                </tr>
              </thead>

              <tbody>
                {vendorTransactions?.map((product, index) => {
                  const total =
                    Number(product.price) * Number(product.quantity);
                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        "py-3",
                        index % 2 === 0 ? evenColor : oddColor,
                      )}
                    >
                      <td className="h-12 px-6 text-left">
                        <p>{product?.id}</p>
                      </td>
                      <td className="text-nowrap px-6 text-left">
                        {product?.product?.name}
                      </td>
                      <td className="text-nowrap px-6 text-left">
                        {formatCurrency(Number(product?.price))}
                      </td>
                      <td className="px-6 text-left">
                        {Number(product?.quantity)}
                      </td>
                      <td className="px-6 text-left">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-6 text-left">
                        {moment
                          .tz(product?.createdAt, timezone)
                          .format("MM/DD/YYYY")}
                      </td>
                      <td className="mt-2 flex gap-3 px-5">
                        {product?.product?.receipt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {vendorTransactions.length === 0 && (
              <div className="p-10 text-center text-lg italic text-slate-500 dark:text-slate-400">
                No purchase transactions found for this vendor.
              </div>
            )}
          </div>
        </div>

        {/* Transactions Cards (Mobile) */}
        <div className="space-y-4 lg:hidden w-full">
          {vendorTransactions.length > 0 && (
            <h4 className="text-lg font-bold">Recent Transactions</h4>
          )}
          {vendorTransactions.map((product, index) => {
            const total = Number(product.price) * Number(product.quantity);
            return (
              <Card
                key={product.id}
                className="relative shadow-lg dark:bg-slate-800/90 border-slate-200 dark:border-slate-700"
              >
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {/* Product Name (Top Left) */}
                    <div className="col-span-2 pb-2 border-b dark:border-slate-700">
                      <div className="text-muted-foreground">Product</div>
                      <div
                        className={`font-semibold text-base ${BASE_TEXT_COLOR}`}
                      >
                        {product?.product?.name}
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <div className="text-muted-foreground">Price</div>
                      <div className={`font-medium text-primary`}>
                        {formatCurrency(Number(product?.price))}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div>
                      <div className="text-muted-foreground">Quantity</div>
                      <div className={`font-medium ${BASE_TEXT_COLOR}`}>
                        {Number(product?.quantity)}
                      </div>
                    </div>

                    {/* Total */}
                    <div>
                      <div className="text-muted-foreground">Total</div>
                      <div className={`font-bold ${BASE_TEXT_COLOR}`}>
                        {formatCurrency(total)}
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <div className="text-muted-foreground">Date</div>
                      <div className={`font-medium ${BASE_TEXT_COLOR}`}>
                        {moment
                          .tz(product?.createdAt, timezone)
                          .format("MM/DD/YYYY")}
                      </div>
                    </div>

                    {/* Receipt */}
                    <div className="col-span-2 pt-2 border-t dark:border-slate-700">
                      <div className="text-muted-foreground">Receipt</div>
                      <div className={`font-medium`}>
                        {product?.product?.receipt ? (
                          <Link
                            href={product.product.receipt}
                            target="_blank"
                            className="text-blue-500 hover:text-blue-400"
                          >
                            View Receipt
                          </Link>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 3. Sidebar: Metrics and Vendor Details */}
        <div className="lg:w-[30%] space-y-5">
          {/* Vendor Details Panel */}
          <div
            className={`w-full rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 ${TRANSITION_UTILITY}`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-slate-700">
              <h3 className={`text-xl font-bold ${BASE_TEXT_COLOR}`}>
                Vendor Details
              </h3>
              <EditVendor
                vendor={vendor!}
                button={
                  // Primary Button Style for Edit Action
                  <button
                    className={`flex items-center gap-1 rounded-lg bg-[${ACCENT_COLOR}] text-white font-medium px-4 py-2 text-sm shadow-md shadow-[${ACCENT_COLOR}]/30 hover:-translate-y-0.5 ${TRANSITION_UTILITY}`}
                  >
                    <PencilLineIcon size={16} />
                    Edit
                  </button>
                }
              />
            </div>

            {/* Structured Vendor Details using DetailRow */}
            <div className="space-y-3">
              {vendor?.name && (
                <DetailRow
                  icon={User}
                  label="Contact Name"
                  value={vendor?.name}
                />
              )}
              {vendor?.companyName && (
                <DetailRow
                  icon={Building2}
                  label="Company Name"
                  value={vendor?.companyName}
                />
              )}
              {vendor?.phone && (
                <DetailRow
                  icon={Phone}
                  label="Phone"
                  value={vendor?.phone}
                  isLink
                  type="tel"
                  linkPrefix="tel:"
                />
              )}
              {vendor?.email && (
                <DetailRow
                  icon={Mail}
                  label="Email"
                  value={vendor?.email}
                  isLink
                  type="email"
                  linkPrefix="mailto:"
                />
              )}
              {vendor?.website && (
                <DetailRow
                  icon={Globe}
                  label="Website"
                  value={vendor?.website}
                  isLink
                  type="web"
                  linkPrefix=""
                />
              )}
              {/* Address fields are often grouped, using DetailRow for structure */}
              {(vendor?.address ||
                vendor?.city ||
                vendor?.state ||
                vendor?.zip) && (
                <>
                  <div className="pt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Address:
                  </div>
                  {vendor?.address && (
                    <div className="ml-3">
                      <DetailRow
                        icon={""}
                        label="Street"
                        value={vendor?.address}
                      />
                    </div>
                  )}
                  {vendor?.city && (
                    <div className="ml-3">
                      <DetailRow icon={""} label="City" value={vendor?.city} />
                    </div>
                  )}
                  {vendor?.state && (
                    <div className="ml-3">
                      <DetailRow
                        icon={""}
                        label="State"
                        value={vendor?.state}
                      />
                    </div>
                  )}
                  {vendor?.zip && (
                    <div className="ml-3">
                      <DetailRow icon={""} label="Zip" value={vendor?.zip} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Metric Cards Container */}
          <div className="flex w-full flex-col gap-5 lg:flex-row">
            {/* Total Purchase Amount Card */}
            <div
              className={`w-full rounded-xl bg-white dark:bg-slate-800 p-4 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 ${TRANSITION_UTILITY}`}
            >
              <div className="h-20 space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1 rounded-md bg-gradient-to-br from-indigo-50 to-white text-primary`}
                  >
                    <DollarSign size={20} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Total Purchase Amount
                  </h3>
                </div>
                <div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={`text-3xl mt-1 block font-semibold text-slate-500 truncate`}
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "100%",
                          }}
                        >
                          {formatCurrency(totalPurchaseAmount)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-xl ring-1 ring-slate-900/5 dark:ring-slate-700/50">
                        {formatCurrency(totalPurchaseAmount)}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            {/* Total Number of Purchase Card */}
            <div
              className={`w-full rounded-xl bg-white dark:bg-slate-800 p-4 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 ${TRANSITION_UTILITY}`}
            >
              <div className="h-20 space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1 rounded-md bg-gradient-to-br from-indigo-50 to-white text-primary`}
                  >
                    <Hash size={20} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Total Purchases
                  </h3>
                </div>
                <div>
                  <p className="mt-1 text-3xl font-semibold text-slate-500">
                    {vendorTransactions?.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

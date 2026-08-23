import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { formatCurrency } from "@/utils/formatCurrency";
import { Tooltip } from "antd";
import { TrendingUp } from "lucide-react";

const SHADOW_COLOR = "shadow-lg shadow-slate-900/10 dark:shadow-white/5";
const INFO_TEXT_COLOR = "text-slate-500 dark:text-slate-400";
const ACCENT_COLOR = "#6571FF";

export default async function TopVendors() {
  const companyId = await getCompanyId();
  const vendorTransactions = await db.inventoryProductHistory.findMany({
    where: { vendor: { companyId } },
    include: {
      product: true,
      vendor: true,
    },
    orderBy: {
      date: "desc",
    },
  });
  // Calculate total purchase amount per vendor
  const vendorTotals = vendorTransactions.reduce<Record<number, number>>(
    (acc, t) => {
      if (!t.vendorId) return acc;
      const total = Number(t?.price || 0) * Number(t?.quantity || 0);
      acc[t?.vendorId] = (acc[t?.vendorId] || 0) + total;
      return acc;
    },
    {},
  );

  // Extract and sort top 10 vendors
  const topVendors = Object.entries(vendorTotals)
    .map(([vendorId, total]) => {
      const vendorData = vendorTransactions.find(
        (t) => t?.vendorId === Number(vendorId),
      )?.vendor;

      return {
        vendorId: Number(vendorId),
        name: vendorData?.name,
        companyName: vendorData?.companyName,
        total,
      };
    })
    .sort((a, b) => b?.total - a?.total)
    .slice(0, 10);

  //  Calculate relative progress using logarithmic scaling
  const maxTotal = Math.max(...topVendors.map((v) => v.total)) || 1;

  return (
    <div
      className={`${SHADOW_COLOR} w-full rounded-xl h-[40%] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-6 transition-shadow duration-300 hover:shadow-2xl pb-20`}
    >
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp size={20} style={{ color: ACCENT_COLOR }} />
        <h3 className="text-xl font-extrabold" style={{ color: ACCENT_COLOR }}>
          Top Vendors
        </h3>
      </div>

      <div className="flex flex-col gap-4 h-full overflow-y-auto">
        {topVendors.map((vendor, i) => {
          const progress =
            (Math.log(vendor?.total + 1) / Math.log(maxTotal + 1)) * 100;

          return (
            <div key={i} className="flex flex-col gap-2">
              <Tooltip
                title={`Total Purchase: ${formatCurrency(vendor?.total)}`}
                placement="top"
              >
                <div className="flex items-center justify-between cursor-pointer">
                  <p className="text-sm font-medium text-slate-700 dark:text-white truncate flex-1 pr-2">
                    {vendor?.companyName}
                  </p>
                  <p className="text-xs font-semibold text-slate-600">
                    {formatCurrency(vendor?.total)}
                  </p>
                </div>
              </Tooltip>

              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: ACCENT_COLOR,
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

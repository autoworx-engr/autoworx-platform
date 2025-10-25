import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { formatCurrency } from "@/utils/formatCurrency";
import { Tooltip } from "antd";

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
    {}
  );

  // Extract and sort top 10 vendors
  const topVendors = Object.entries(vendorTotals)
    .map(([vendorId, total]) => {
      const vendorData = vendorTransactions.find(
        (t) => t?.vendorId === Number(vendorId)
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
    <div className="app-shadow h-[30%]  w-full rounded-lg bg-background p-5">
      <h3 className="text-xl font-bold">Top Vendors</h3>

      <div className="flex h-[90%] flex-col gap-3 overflow-y-auto p-3">
        {topVendors.map((vendor, i) => {
          const progress =
            (Math.log(vendor?.total + 1) / Math.log(maxTotal + 1)) * 100;

          return (
            <div key={i} className="flex items-center justify-between gap-3">
              <p className="text-sm w-[30%] truncate">{vendor?.companyName}</p>

              <Tooltip
                title={`Total Purchase: ${formatCurrency(vendor?.total)}`}
                placement="top"
              >
                <div className="h-2 flex-1 cursor-pointer rounded-md bg-gray-200">
                  <div
                    className="h-2 rounded-md bg-[#6571FF] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
}

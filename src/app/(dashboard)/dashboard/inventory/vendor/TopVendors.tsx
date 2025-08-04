import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import React from "react";
import { Tooltip } from "antd";
import { formatCurrency } from "@/utils/formatCurrency";

export default async function TopVendors() {
  const companyId = await getCompanyId();

  const vendors = await db.vendor.findMany({
    select: {
      inventoryProducts: true,
      id: true,
      name: true,
      companyName: true,
    },
    where: { companyId },
  });

  // sum up the total inventory products price * quantity for each vendor
  const topVendors = vendors
    .map((vendor) => {
      const total = vendor.inventoryProducts.reduce((acc, product) => {
        return (
          acc + ((product.price as any) || 0) * Number(product.quantity || 0)
        );
      }, 0);

      return {
        total,
        name: vendor.name,
        companyName: vendor?.companyName,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className="app-shadow h-[45%] w-full rounded-lg bg-background p-5">
      <h3 className="text-xl font-bold">Top Vendors</h3>

      <div className="flex h-[90%] flex-col gap-3 overflow-y-auto p-3">
        {topVendors
          .sort((a, b) => b.total - a.total)
          .map((vendor, i) => (
            <div key={i} className="flex items-center justify-between">
              <p className="text-sm">{vendor?.companyName}</p>
              {/* progress bar with tooltip */}
              <Tooltip
                title={`Total Purchase: ${formatCurrency(vendor.total)}`}
                placement="top"
              >
                <div className="h-2 w-[50%] cursor-pointer rounded-md bg-gray-200">
                  <div
                    className="h-2 rounded-md bg-[#6571FF]"
                    style={{
                      width: `${(vendor.total / topVendors[0].total) * 100}%`,
                    }}
                  ></div>
                </div>
              </Tooltip>
            </div>
          ))}
      </div>
    </div>
  );
}

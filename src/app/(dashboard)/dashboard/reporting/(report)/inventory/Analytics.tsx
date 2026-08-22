import { db } from "@/lib/db";
// import RevenueSalesLineChartContainer from "../revenue/chart/RevenueLineChartContainer";
import { authOptions } from "@/authOptions";
import {
  InventoryProductHistoryType,
  InventoryProductType,
  InventoryProduct,
  InventoryProductHistory,
} from "@prisma/client";
import moment from "moment";
import { getServerSession } from "next-auth";
import ChartNavigateButtons from "./ChartNavigateButtons";
import InventoryBarChartContainer from "./chart/InventoryBarChartContainer";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";
type TProps = {
  leftChart: string;
  startDate?: string;
  endDate?: string;
  types?: string;
  timezone: string;
};

const leftSideChartString = {
  Sales: "Sales",
  Purchases: "Purchases",
  ROI: "ROI",
};

export default async function Analytics({
  leftChart,
  timezone,
  startDate,
  endDate,
  types,
}: TProps) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  if (!companyId) return null;
  let last30Days = moment().subtract(30, "days").toDate();
  let today = moment().toDate();

  const formattedLast30Days = FormatUtcToTimezone(
    last30Days,
    timezone,
    "YYYY-MM-DD",
  );
  const formattedToday = FormatUtcToTimezone(today, timezone, "YYYY-MM-DD");

  const inventoryProducts = await db.inventoryProduct.findMany({
    where: {
      companyId,
      type: types as InventoryProductType | undefined,
      InventoryProductHistory: {
        some: {
          date: {
            gte:
              startDate && startDate !== "undefined"
                ? moment.utc(startDate, "MM/DD/YYYY").toDate()
                : new Date(`${formattedLast30Days}T00:00:00.000Z`),
            lte:
              endDate && endDate !== "undefined"
                ? moment.utc(endDate, "MM/DD/YYYY").endOf("day").toDate()
                : new Date(`${formattedToday}T23:59:59.999Z`),
          },
        },
      },
    },
    select: {
      category: true,
      createdAt: true,
      InventoryProductHistory: {
        where: {
          date: {
            gte:
              startDate && startDate !== "undefined"
                ? moment.utc(startDate, "MM/DD/YYYY").toDate()
                : new Date(`${formattedLast30Days}T00:00:00.000Z`),
            lte:
              endDate && endDate !== "undefined"
                ? moment.utc(endDate, "MM/DD/YYYY").endOf("day").toDate()
                : new Date(`${formattedToday}T23:59:59.999Z`),
          },
        },
      },
    },
  });

  // find unique categories for sales
  const getCategory = Array.from(
    new Set(inventoryProducts.map((inventory) => inventory?.category?.name)),
  );
  // sales data by category
  const salesData = getCategory.map((category) => {
    return inventoryProducts.reduce(
      (acc, cur) => {
        if (cur.category?.name === category) {
          // console.log("cur", cur);
          acc.salePrice += cur.InventoryProductHistory.reduce((acc, cur) => {
            if (cur.type === "Sale") {
              acc += Number(cur.quantity) * Number(cur.price);
            }
            return acc;
          }, 0);
        }
        acc.salePrice = Number(acc.salePrice.toFixed(2));
        return acc;
      },
      { categoryName: category, salePrice: 0 },
    );
  });
  // console.log("salesData", salesData);
  const daysSalesOrPurchasesObj = Array.from({ length: 31 }, (_, i) => {
    let day = moment.tz(timezone).subtract(i, "days").format("MMM Do, YYYY");
    return day;
  }).reduce(
    (acc, day) => {
      acc[day] = { day: day, purchase: 0, sales: 0 };
      return acc;
    },
    {} as Record<string, { day: string; purchase: number; sales: 0 }>,
  );

  inventoryProducts.forEach((inventory) => {
    inventory.InventoryProductHistory.forEach((history) => {
      const day = FormatUtcToTimezone(history.date, timezone, "MMM Do, YYYY");
      if (history.type === "Purchase" && daysSalesOrPurchasesObj[day as any]) {
        daysSalesOrPurchasesObj[day as any].purchase +=
          Number(history.quantity) * Number(history.price);
      }
      if (
        (history.type as InventoryProductHistoryType) === "Sale" &&
        daysSalesOrPurchasesObj[day as any]
      ) {
        daysSalesOrPurchasesObj[day as any].sales +=
          Number(history.quantity) * Number(history.price);
      }
    });
  });

  let leftSideChart = (
    <InventoryBarChartContainer yAxisLabel="Sale Price" chartData={salesData} />
  );

  // left side Chart selection
  if (leftSideChartString.Sales === leftChart) {
    leftSideChart = (
      <InventoryBarChartContainer
        yAxisLabel="Sale Price"
        chartData={salesData}
      />
    );
  } else if (leftSideChartString.Purchases === leftChart) {
    const purchasesData = getCategory.map((category) => {
      return inventoryProducts.reduce(
        (acc, cur) => {
          if (cur.category?.name === category) {
            acc.salePrice += cur.InventoryProductHistory.reduce((acc, cur) => {
              if ((cur.type as InventoryProductHistoryType) === "Purchase") {
                acc += Number(cur.quantity) * Number(cur.price);
              }
              return acc;
            }, 0);
          }
          acc.salePrice = Number(acc.salePrice.toFixed(2));
          return acc;
        },
        { categoryName: category, salePrice: 0 },
      );
    });
    leftSideChart = (
      <InventoryBarChartContainer
        yAxisLabel="Purchase Price"
        chartData={purchasesData}
      />
    );
  } else if (leftSideChartString.ROI === leftChart) {
    leftSideChart = <p>Will be added soon!</p>;
  }

  return (
    <div className="rounded-lg border p-3 md:p-6">
      <h1 className="py-4 text-4xl font-bold">Analytics</h1>
      <div className="mx-5 grid grid-cols-1 space-x-10 md:mx-10 md:space-x-20">
        <div className="">
          <div className="my-5 flex justify-center">
            <ChartNavigateButtons
              key={1}
              buttonsValue={["Sales", "Purchases", "ROI"]}
              queryName="leftChart"
              chartDirectionValue={leftChart}
            />
          </div>
          {leftSideChart}
        </div>
      </div>
    </div>
  );
}

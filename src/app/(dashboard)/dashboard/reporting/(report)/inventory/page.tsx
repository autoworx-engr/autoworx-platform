import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import {
  InventoryProductHistoryType,
  InventoryProductType,
} from "@prisma/client";
import moment from "moment";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import Analytics from "./Analytics";
import AnalyticsVisibility from "./AnalyticsVisibility";
import CalculationContainer from "./CalculationContainer";
import FilterHeader from "./FilterHeader";
import InventoryDisplay from "./InventoryDisplay";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";

type TProps = {
  searchParams: {
    category?: string;
    startDate?: string;
    endDate?: string;
    service?: string;
    search?: string;
    leftChart: string;
    rightChart: string;
    types?: string;
  };
};

export default async function InventoryReportPage({ searchParams }: TProps) {
  const session = await getServerSession(authOptions);
  const { timezone } = await getCompanyTimezone();

  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (searchParams.startDate && searchParams.endDate) {
    const formattedStartDate = moment(
      decodeURIComponent(searchParams.startDate),
      "MM-DD-YYYY",
    ).format("YYYY-MM-DD");

    const formattedEndDate = moment(
      decodeURIComponent(searchParams.endDate),
      "MM-DD-YYYY",
    ).format("YYYY-MM-DD");

    startDate = new Date(`${formattedStartDate}T00:00:00.000Z`);
    endDate = new Date(`${formattedEndDate}T23:59:59.999Z`);
  }

  const typeFilter = searchParams.types as InventoryProductType | undefined;

  const inventoryProducts = await db.inventoryProduct.findMany({
    where: {
      companyId: session?.user?.companyId,
      name: searchParams.search ? { contains: searchParams.search } : undefined,
      category: {
        name: searchParams?.category || undefined,
      },
      type: typeFilter,
      ...(startDate && endDate
        ? {
            InventoryProductHistory: {
              some: {
                date: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          }
        : {}),
    },
    include: {
      category: true,
      InventoryProductHistory:
        startDate && endDate
          ? {
              where: {
                date: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            }
          : true, // Include all history if no date filter
    },
  });

  const allInventoryProducts = await db.inventoryProduct.findMany({
    where: {
      companyId: session?.user?.companyId,
    },
    select: {
      type: true,
    },
  });

  // Get unique categories
  const getCategory = Array.from(
    new Set(inventoryProducts.map((product) => `${product?.category?.name}`)),
  ).map((uniqueName) => uniqueName);

  // Get unique types
  const getType = Array.from(
    new Set(allInventoryProducts.map((product) => `${product?.type}`)),
  ).map((uniqueName) => uniqueName);

  const purchasesData = ["Product", "Supply"].map((type) => {
    const totalPurchase = inventoryProducts
      .filter((product) => product.type === type)
      .reduce((acc, product) => {
        const productPurchase = product.InventoryProductHistory.reduce(
          (sum, history) => {
            if ((history.type as InventoryProductHistoryType) === "Purchase") {
              sum += Number(history.quantity) * Number(history.price);
            }
            return sum;
          },
          0,
        );
        return acc + productPurchase;
      }, 0);

    return {
      type,
      salePrice: Number(totalPurchase.toFixed(2)),
    };
  });

  return (
    <div className="space-y-5">
      <Suspense fallback="loading...">
        <CalculationContainer
          startDate={decodeURIComponent(searchParams?.startDate as string)}
          endDate={decodeURIComponent(searchParams?.endDate as string)}
          getType={getType}
          typeFilterApplied={!!searchParams.types}
          purchasesData={purchasesData}
        />
      </Suspense>
      {/* Filter section */}
      <FilterHeader
        searchParams={searchParams}
        getCategory={getCategory}
        getType={getType}
      />
      {/* Display filtered inventory products */}
      <InventoryDisplay
        inventoryProducts={inventoryProducts}
        timezone={timezone}
      />

      {/* Analytics will only be loaded and rendered on desktop */}
      <Suspense fallback={"loading ..."}>
        <AnalyticsVisibility>
          <Analytics
            timezone={timezone}
            leftChart={searchParams.leftChart}
            startDate={decodeURIComponent(searchParams?.startDate as string)}
            endDate={decodeURIComponent(searchParams?.endDate as string)}
            types={searchParams.types}
          />
        </AnalyticsVisibility>
      </Suspense>
    </div>
  );
}

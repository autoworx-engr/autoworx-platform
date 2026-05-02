import React from "react";
import Calculation from "../../components/Calculation";
import { db } from "@/lib/db";
import { getCompanyId } from "@/lib/companyId";
import CalculationWithTooltip from "@/app/(dashboard)/dashboard/reporting/components/CalculationWithTooltip";

interface CalculationContainerProps {
  startDate: string | undefined;
  endDate: string | undefined;
  getType: string | string[];
  typeFilterApplied: boolean;
  purchasesData: { type: string; salePrice: number }[];
}

export default async function CalculationContainer({
  startDate,
  endDate,
  getType,
  typeFilterApplied,
  purchasesData,
}: CalculationContainerProps) {
  const companyId = await getCompanyId();

  // Validate startDate and endDate
  let start, end;

  if (startDate && startDate !== "undefined") {
    start = new Date(startDate);
  }

  if (endDate && endDate !== "undefined") {
    end = new Date(endDate);
    // Set to end of day to include all entries on this date
    end.setHours(23, 59, 59, 999);
  }

  // Fetch supplies and products filtered by date range
  const suppliesPromise = db.inventoryProduct.findMany({
    where: {
      type: "Supply",
      companyId,
      ...(start &&
        end && {
          createdAt: {
            gte: start,
            lte: end,
          },
        }),
    },
    select: {
      price: true,
      quantity: true,
      createdAt: true,
    },
  });

  const productsPromise = db.inventoryProduct.findMany({
    where: {
      type: "Product",
      companyId,
      ...(start &&
        end && {
          createdAt: {
            gte: start,
            lte: end,
          },
        }),
    },
    select: {
      price: true,
      quantity: true,
      createdAt: true,
    },
  });

  // Fetch all supplies and products (without date filter) for total calculations
  const allSuppliesPromise = db.inventoryProduct.findMany({
    where: {
      type: "Supply",
      companyId,
    },
    select: {
      price: true,
      quantity: true,
    },
  });

  const allProductsPromise = db.inventoryProduct.findMany({
    where: {
      type: "Product",
      companyId,
    },
    select: {
      price: true,
      quantity: true,
    },
  });

  const [totalSupplies, totalProducts, allSupplies, allProducts] =
    await Promise.all([
      suppliesPromise,
      productsPromise,
      allSuppliesPromise,
      allProductsPromise,
    ]);

  // Calculate total prices for all time
  const totalSuppliesPrice = allSupplies.reduce(
    (acc, supply) =>
      acc + Number(supply.price!) * Number(supply.quantity!) || 0,
    0,
  );

  const totalProductPrice = allProducts.reduce(
    (acc, product) =>
      acc + Number(product.price!) * Number(product?.quantity!) || 0,
    0,
  );

  // Calculate date-based prices
  const totalDateBasedProductPrice = totalProducts.reduce((acc, product) => {
    return acc + Number(product.price || 0) * Number(product.quantity || 0);
  }, 0);

  const totalDateBasedSuppliesPrice = totalSupplies.reduce((acc, supply) => {
    return acc + Number(supply.price || 0) * Number(supply.quantity || 0);
  }, 0);

  // Check if any filters are active
  const hasDateFilter = !!(
    startDate &&
    endDate &&
    startDate !== "undefined" &&
    endDate !== "undefined"
  );

  // Use explicit typeFilterApplied flag
  const hasTypeFilter = typeFilterApplied;

  // Only show filtered calculations when filters are applied
  const showFilteredCalculation = hasDateFilter || hasTypeFilter;

  // Check if we're specifically filtering by Product or Supply type
  const showProductFilter =
    !hasTypeFilter || (Array.isArray(getType) && getType.includes("Product"));

  const showSupplyFilter =
    !hasTypeFilter || (Array.isArray(getType) && getType.includes("Supply"));
  return (
    <div className="mb-4 mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-4 xl:grid-cols-4">
      <Calculation content="Total Products" amount={totalProductPrice} />
      <Calculation content="Total Supplies" amount={totalSuppliesPrice} />

      {/* Only show filtered product calculation when applicable */}
      {hasDateFilter && (
        <CalculationWithTooltip
          content="Total Product Purchase (Filtered)"
          amount={purchasesData ? purchasesData?.[0].salePrice : 0}
          hasDateRange={hasDateFilter}
          startDate={startDate}
          endDate={endDate}
          defaultTooltip="Total value of filtered products in inventory"
        />
      )}

      {/* Only show filtered supply calculation when applicable */}
      {hasDateFilter && (
        <CalculationWithTooltip
          content="Total Supply Purchase (Filtered)"
          amount={purchasesData ? purchasesData?.[1].salePrice : 0}
          hasDateRange={hasDateFilter}
          startDate={startDate}
          endDate={endDate}
          defaultTooltip="Total value of filtered supplies in inventory"
        />
      )}
    </div>
  );
}

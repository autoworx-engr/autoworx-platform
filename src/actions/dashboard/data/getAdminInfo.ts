"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { growthRate, getDateRanges } from "./lib";
import {
  calculateCompanyUnifiedCurrentMonthEarnings,
  calculateCompanyUnifiedPreviousMonthEarnings,
} from "@/lib/unifiedPayout";

/**
 * Get admin information including total jobs, ongoing jobs, completed jobs, revenue, expected revenue, and inventory.
 */
export async function getAdminInfo(timezone: string) {
  const [
    totalJobs,
    ongoingJobs,
    completedJobs,
    revenue,
    expectedRevenue,
    inventory,
    employeePayout,
    totalLeads,
    leadsConvertedData,
    conversionRateData,
  ] = await Promise.all([
    getTotalJobs(),
    getOngoingJobs(),
    getCompletedJobs(timezone),
    getRevenue(timezone),
    getExpectedRevenue(),
    getInventory(timezone),
    getEmployeePayout(timezone),
    getTotalLeadsPerMonth(timezone),
    getConvertedLeadsPerMonth(timezone),
    getConversionRateWithGrowth(timezone),
  ]);

  const { current: currentTotalLeads, previous: previousTotalLeads } =
    totalLeads;
  const { currentConversionRate, conversionRateGrowth } = conversionRateData;

  return {
    totalJobs,
    ongoingJobs,
    completedJobs,
    revenue,
    expectedRevenue,
    inventory,
    employeePayout,
    currentTotalLeads,
    previousTotalLeads,
    leadsConvertedData,
    currentConversionRate,
    conversionRateGrowth,
  };
}

/**
 * Get total jobs for the current and previous months.
 */
export async function getTotalJobs(currentCompanyId?: number) {
  try {
    let companyId = currentCompanyId;
    if (!companyId) {
      companyId = await getCompanyId();
    }

    // get all work orders that are pending
    const totalJobs = await db.invoice.count({
      where: {
        companyId,
        type: "Invoice",
        isWorkOrder: true,
        column: {
          title: "Pending",
        },
      },
    });

    return {
      jobs: totalJobs,
    };
  } catch (error) {
    console.error("Error fetching total jobs:", error);
    return { jobs: 0 };
  }
}

/**
 * Get ongoing jobs for the current month.
 */
export async function getOngoingJobs(currentCompanyId?: number) {
  try {
    let companyId = currentCompanyId;
    if (!companyId) {
      companyId = await getCompanyId();
    }

    const ongoingJobsCount = await db.invoice.count({
      where: {
        companyId,
        type: "Invoice",
        isWorkOrder: true,
        column: {
          title: {
            in: ["In Progress", "Re-Dos"],
          },
        },
      },
    });

    return {
      ongoingJobs: ongoingJobsCount,
    };
  } catch (error) {
    console.error("Error fetching ongoing jobs:", error);
    return { ongoingJobs: 0 };
  }
}

/**
 * Get completed jobs for the current and previous months.
 */
export async function getCompletedJobs(
  timezone: string,
  currentCompanyId?: number,
) {
  try {
    let companyId = currentCompanyId;
    if (!companyId) {
      companyId = await getCompanyId();
    }
    const {
      currentMonthStart,
      currentMonthEnd,
      previousMonthStart,
      previousMonthEnd,
    } = getDateRanges(timezone);

    const currentMonthCompletedJobs = await db.invoice.count({
      where: {
        companyId,
        type: "Invoice",
        isWorkOrder: true,
        OR: [
          {
            column: {
              title: "Completed",
            },
            completedAt: {
              gte: currentMonthStart,
              lte: currentMonthEnd,
            },
          },
          {
            column: {
              title: "Delivered",
            },
            deliveredAt: {
              gte: currentMonthStart,
              lte: currentMonthEnd,
            },
          },
        ],
      },
    });

    const previousMonthCompletedJobs = await db.invoice.count({
      where: {
        companyId,
        isWorkOrder: true,
        OR: [
          {
            column: {
              title: "Completed",
            },
            completedAt: {
              gte: previousMonthStart,
              lte: previousMonthEnd,
            },
          },
          {
            column: {
              title: "Delivered",
            },
            deliveredAt: {
              gte: previousMonthStart,
              lte: previousMonthEnd,
            },
          },
        ],
      },
    });

    return {
      completedJobs: currentMonthCompletedJobs,
      growth: growthRate(currentMonthCompletedJobs, previousMonthCompletedJobs),
    };
  } catch (error) {
    console.error("Error fetching completed jobs:", error);
    return {
      completedJobs: 0,
      growth: growthRate(0, 0),
    };
  }
}

/**
 * Get revenue for the current and previous months.
 */
export async function getRevenue(timezone: string, currentCompanyId?: number) {
  let companyId = currentCompanyId;
  if (!companyId) {
    companyId = await getCompanyId();
  }
  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);

  try {
    const currentMonthRevenueSum = await db.invoice.aggregate({
      _sum: {
        grandTotal: true,
      },
      where: {
        companyId,
        column: {
          title: "Delivered",
        },
        type: "Invoice",
        deliveredAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    const currentMonthRevenue = Number(
      currentMonthRevenueSum._sum.grandTotal || 0,
    );

    const previousMonthRevenueSum = await db.invoice.aggregate({
      _sum: {
        grandTotal: true,
      },
      where: {
        companyId,
        type: "Invoice",
        column: {
          title: "Delivered",
        },
        deliveredAt: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
    });

    const previousMonthRevenue = Number(
      previousMonthRevenueSum._sum.grandTotal || 0,
    );

    return {
      revenue: currentMonthRevenue,
      growth: growthRate(currentMonthRevenue, previousMonthRevenue),
    };
  } catch (error) {
    console.error("Error calculating revenue, returning zeroed values:", error);
    return {
      revenue: 0,
      growth: growthRate(0, 0),
    };
  }
}

/**
 * Get expected revenue for the current and previous months.
 */
export async function getExpectedRevenue(currentCompanyId?: number) {
  let companyId = currentCompanyId;
  if (!companyId) {
    companyId = await getCompanyId();
  }

  try {
    const expectedRevenueSum = await db.invoice.aggregate({
      _sum: {
        grandTotal: true,
      },
      where: {
        companyId,
        type: "Invoice",
        column: {
          OR: [
            { title: "Pending" },
            { title: "In Progress" },
            { title: "Completed" },
          ],
        },
      },
    });

    const totalExpectedRevenue = Number(
      expectedRevenueSum._sum.grandTotal || 0,
    );

    return {
      revenue: totalExpectedRevenue,
    };
  } catch (error) {
    console.error("Error calculating expected revenue, returning zero:", error);
    return { revenue: 0 };
  }
}

/**
 * Get inventory information including total value, current month total, and growth rate.
 */
export async function getInventory(
  timezone: string,
  currentCompanyId?: number,
) {
  try {
    let companyId = currentCompanyId;
    if (!companyId) {
      companyId = await getCompanyId();
    }
    const {
      currentMonthStart,
      currentMonthEnd,
      previousMonthStart,
      previousMonthEnd,
    } = getDateRanges(timezone);
    const inventoryProducts = await db.inventoryProduct.findMany({
      where: {
        type: "Product",
        companyId,
      },
    });

    const totalInventoryValue = inventoryProducts.reduce(
      (acc, product) =>
        acc + Number(product.price) * Number(product.quantity || 0),
      0,
    );

    const currentMonthInventoryHistory =
      await db.inventoryProductHistory.findMany({
        where: {
          companyId,
          type: "Purchase",
          createdAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
          product: {
            type: "Product",
          },
        },
      });

    const previousMonthInventoryHistory =
      await db.inventoryProductHistory.findMany({
        where: {
          companyId,
          type: "Purchase",
          createdAt: {
            gte: previousMonthStart,
            lte: previousMonthEnd,
          },
          product: {
            type: "Product",
          },
        },
      });

    const currentMonthInventoryCost = currentMonthInventoryHistory.reduce(
      (acc, history) =>
        acc + Number(history.price || 0) * Number(history.quantity),
      0,
    );

    const previousMonthInventoryCost = previousMonthInventoryHistory.reduce(
      (acc, history) => acc + Number(history.price) * Number(history.quantity),
      0,
    );

    return {
      totalValue: totalInventoryValue,
      currentMonthTotal: currentMonthInventoryCost,
      growth: growthRate(currentMonthInventoryCost, previousMonthInventoryCost),
    };
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return {
      totalValue: 0,
      currentMonthTotal: 0,
      growth: growthRate(0, 0),
    };
  }
}

export async function getEmployeePayout(
  timezone: string,
  currentCompanyId?: number,
) {
  try {
    let companyId = currentCompanyId;
    if (!companyId) {
      companyId = await getCompanyId();
    }

    // Use unified payout calculations that include both work-based and salary earnings
    const currentMonthPayoutTotal =
      await calculateCompanyUnifiedCurrentMonthEarnings(companyId!);
    const previousMonthPayoutTotal =
      await calculateCompanyUnifiedPreviousMonthEarnings(companyId!);

    return {
      currentMonthTotal: currentMonthPayoutTotal,
      growth: growthRate(currentMonthPayoutTotal, previousMonthPayoutTotal),
    };
  } catch (error) {
    console.error("Error fetching employee payout:", error);
    return {
      currentMonthTotal: 0,
      growth: growthRate(0, 0),
    };
  }
}

//leads per month

export const getTotalLeadsPerMonth = async (
  timezone: string,
  currentCompanyId?: number,
): Promise<{
  current: number;
  previous: number;
}> => {
  let companyId = currentCompanyId;
  if (!companyId) {
    companyId = await getCompanyId();
  }

  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);
  try {
    const currentTotalLeads = await db.lead.count({
      where: {
        companyId,
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    const previousTotalLeads = await db.lead.count({
      where: {
        companyId,
        // columnId: {
        //   not: convertedColumn.id,
        // },
        createdAt: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
    });

    return { current: currentTotalLeads, previous: previousTotalLeads };
  } catch (error) {
    console.error("Error fetching total leads per month:", error);
    return { current: 0, previous: 0 };
  }
};

export async function getConvertedLeadsPerMonth(
  timezone: string,
  currentCompanyId?: number,
) {
  let companyId = currentCompanyId;

  if (!companyId) {
    companyId = await getCompanyId();
  }

  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);
  try {
    const convertedColumn = await db.column.findFirst({
      where: {
        title: "Converted",
        companyId,
      },
    });

    if (!convertedColumn) {
      throw new Error("Converted column not found");
    }

    const currentConvertedLeads = await db.lead.count({
      where: {
        companyId,
        columnId: convertedColumn.id,
        column: {
          title: "Converted",
        },
        columnChangedAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    const previousConvertedLeads = await db.lead.count({
      where: {
        companyId,
        columnId: convertedColumn.id,
        column: {
          title: "Converted",
        },
        columnChangedAt: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
    });

    return {
      current: currentConvertedLeads,
      previous: previousConvertedLeads,
      growth: growthRate(currentConvertedLeads, previousConvertedLeads),
    };
  } catch (error) {
    console.error("Error fetching converted leads per month:", error);
    return {
      current: 0,
      previous: 0,
      growth: growthRate(0, 0),
    };
  }
}

export async function getConversionRateWithGrowth(
  timezone: string,
  currentCompanyId?: number,
) {
  let companyId = currentCompanyId;
  if (!companyId) {
    companyId = await getCompanyId();
  }
  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);
  try {
    const convertedColumn = await db.column.findFirst({
      where: {
        title: "Converted",
        companyId,
      },
    });

    if (!convertedColumn) {
      throw new Error("Converted column not found");
    }

    // Leads created and converted in the current month
    const currentCreatedAndConvertedLeads = await db.lead.count({
      where: {
        companyId,
        columnId: convertedColumn.id,
        column: {
          title: "Converted",
        },
        columnChangedAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    // Total leads created in the current month
    const { current: currentTotalLeads, previous: previousTotalLeads } =
      await getTotalLeadsPerMonth(timezone, companyId);

    // Leads created and converted in the previous month
    const previousCreatedAndConvertedLeads = await db.lead.count({
      where: {
        companyId,
        columnId: convertedColumn.id,
        column: {
          title: "Converted",
        },
        columnChangedAt: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
    });

    // Calculate conversion rates
    const currentConversionRate =
      currentTotalLeads > 0
        ? (currentCreatedAndConvertedLeads / currentTotalLeads) * 100
        : 0;

    const previousConversionRate =
      previousTotalLeads > 0
        ? (previousCreatedAndConvertedLeads / previousTotalLeads) * 100
        : 0;

    // Calculate growth rate
    const growthRateValue = currentConversionRate - previousConversionRate;
    const isPositive = growthRateValue > 0;
    const conversionRateGrowth = {
      rate: Math.abs(growthRateValue),
      isPositive,
    };

    return {
      currentConversionRate,
      previousConversionRate,
      conversionRateGrowth,
    };
  } catch (error) {
    console.error("Error calculating conversion rate with growth:", error);
    return {
      currentConversionRate: 0,
      previousConversionRate: 0,
      conversionRateGrowth: { rate: 0, isPositive: false },
    };
  }
}

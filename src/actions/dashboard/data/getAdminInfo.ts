"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { growthRate, getDateRanges } from "./lib";

/**
 * Get admin information including total jobs, ongoing jobs, completed jobs, revenue, expected revenue, and inventory.
 */
export async function getAdminInfo(timezone: string) {
  const totalJobs = await getTotalJobs();
  const ongoingJobs = await getOngoingJobs();
  const completedJobs = await getCompletedJobs(timezone);
  const revenue = await getRevenue(timezone);
  const expectedRevenue = await getExpectedRevenue();
  const inventory = await getInventory(timezone);
  const employeePayout = await getEmployeePayout(timezone);

  const { current: currentTotalLeads, previous: previousTotalLeads } =
    await getTotalLeadsPerMonth(timezone);
  const leadsConvertedData = await getConvertedLeadsPerMonth(timezone);
  const conversionRateData = await getConversionRateWithGrowth(timezone);
  const currentConversionRate = conversionRateData.currentConversionRate;
  const conversionRateGrowth = conversionRateData.conversionRateGrowth;
  // console.log("conversionRateGrowth", conversionRateGrowth);
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
async function getTotalJobs() {
  const companyId = await getCompanyId();

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
}

/**
 * Get ongoing jobs for the current month.
 */
async function getOngoingJobs() {
  const companyId = await getCompanyId();

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
}

/**
 * Get completed jobs for the current and previous months.
 */
async function getCompletedJobs(timezone: string) {
  const companyId = await getCompanyId();
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
}

/**
 * Get revenue for the current and previous months.
 */
async function getRevenue(timezone: string) {
  const companyId = await getCompanyId();
  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);
  const currentMonthInvoices = await db.invoice.findMany({
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

  const currentMonthRevenue = currentMonthInvoices.reduce(
    (acc, invoice) => acc + Number(invoice.grandTotal || 0),
    0,
  );

  const previousMonthInvoices = await db.invoice.findMany({
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

  const previousMonthRevenue = previousMonthInvoices.reduce(
    (acc, invoice) => acc + (Number(invoice.grandTotal) || 0),
    0,
  );

  return {
    revenue: currentMonthRevenue,
    growth: growthRate(currentMonthRevenue, previousMonthRevenue),
  };
}

/**
 * Get expected revenue for the current and previous months.
 */
async function getExpectedRevenue() {
  const companyId = await getCompanyId();

  const pendingInvoices = await db.invoice.findMany({
    where: {
      companyId,
      type: "Invoice",
      column: {
        // title not Delivered
        OR: [
          {
            title: "Pending",
          },
          {
            title: "In Progress",
          },
          {
            title: "Completed",
          },
        ],
      },
    },
  });

  const totalExpectedRevenue = pendingInvoices.reduce(
    (acc, invoice) => acc + (Number(invoice.grandTotal) || 0),
    0,
  );

  return {
    revenue: totalExpectedRevenue,
  };
}

/**
 * Get inventory information including total value, current month total, and growth rate.
 */
async function getInventory(timezone: string) {
  const companyId = await getCompanyId();
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
}

async function getEmployeePayout(timezone: string) {
  const companyId = await getCompanyId();
  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);
  const currentMonthPayout = await db.technician.findMany({
    where: {
      companyId,
      dateClosed: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
      status: "Complete",
    },
  });

  const previousMonthPayout = await db.technician.findMany({
    where: {
      companyId,
      dateClosed: {
        gte: previousMonthStart,
        lte: previousMonthEnd,
      },
      status: "Complete",
    },
  });

  const currentMonthPayoutTotal = currentMonthPayout.reduce(
    (acc, technician) => acc + Number(technician.amount),
    0,
  );

  const previousMonthPayoutTotal = previousMonthPayout.reduce(
    (acc, technician) => acc + Number(technician.amount),
    0,
  );

  return {
    currentMonthTotal: currentMonthPayoutTotal,
    growth: growthRate(currentMonthPayoutTotal, previousMonthPayoutTotal),
  };
}

//leads per month

export const getTotalLeadsPerMonth = async (
  timezone: string,
): Promise<{
  current: number;
  previous: number;
}> => {
  const companyId = await getCompanyId();
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
    throw error;
  }
};

async function getConvertedLeadsPerMonth(timezone: string) {
  const companyId = await getCompanyId();
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
    throw error;
  }
}

async function getConversionRateWithGrowth(timezone: string) {
  const companyId = await getCompanyId();
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
      await getTotalLeadsPerMonth(timezone);

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
    throw error;
  }
}

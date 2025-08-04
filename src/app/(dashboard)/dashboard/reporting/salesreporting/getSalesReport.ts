"use server";
import { getDateRanges, growthRate } from "@/actions/dashboard/data/lib";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import { Client, Invoice, Lead } from "@prisma/client";
import { notFound } from "next/navigation";

/**
 * Helper function to sum invoice grand totals from nested lead → client → invoice structure
 */
function sumInvoiceTotals(
  leads: (Lead & { Client: (Client & { Invoice: Invoice[] })[] })[],
): number {
  return leads
    .flatMap((lead) =>
      lead.Client.flatMap((client) =>
        client.Invoice.map((invoice) => invoice.grandTotal),
      ),
    )
    .filter((total) => total !== null)
    .reduce((acc, curr) => acc + (curr ? Number(curr) : 0), 0);
}

export async function getSalesReportData(timezone: string) {
  const currentuser = await getUser();
  const companyId = await getCompanyId();

  const employee = await db.user.findUnique({
    where: { id: currentuser.id, companyId },
  });

  if (!employee) return notFound();

  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
    twoMonthsAgoStart,
    twoMonthsAgoEnd,
  } = getDateRanges(timezone);

  // Current month
  const currentMonthLeads = await db.lead.findMany({
    where: { assignedSalesUserId: employee.id },
    include: {
      Client: {
        include: {
          Invoice: {
            where: {
              type: "Invoice",
              convertedAt: {
                gte: currentMonthStart,
                lte: currentMonthEnd,
              },
            },
          },
        },
      },
    },
  });

  for (const lead of currentMonthLeads) {
    if (lead.Client.length === 0 && lead.clientId) {
      let fallbackClient = await db.client.findFirst({
        where: {
          companyId,
          id: lead.clientId,
        },
        include: {
          Invoice: {
            where: {
              type: "Invoice",
              convertedAt: {
                gte: currentMonthStart,
                lte: currentMonthEnd,
              },
            },
          },
        },
      });
      fallbackClient && lead.Client.push(fallbackClient);
    }
  }

  const currentTotal = sumInvoiceTotals(currentMonthLeads);
  const currentCommission = (currentTotal * Number(employee.commission)) / 100;

  // Previous month
  const previousMonthLeads = await db.lead.findMany({
    where: { assignedSalesUserId: employee.id },
    include: {
      Client: {
        include: {
          Invoice: {
            where: {
              type: "Invoice",
              convertedAt: {
                gte: previousMonthStart,
                lte: previousMonthEnd,
              },
            },
          },
        },
      },
    },
  });

  for (const lead of previousMonthLeads) {
    if (lead.Client.length === 0 && lead.clientId) {
      let fallbackClient = await db.client.findFirst({
        where: {
          companyId,
          id: lead.clientId,
        },
        include: {
          Invoice: {
            where: {
              type: "Invoice",
              convertedAt: {
                gte: previousMonthStart,
                lte: previousMonthEnd,
              },
            },
          },
        },
      });
      fallbackClient && lead.Client.push(fallbackClient);
    }
  }

  const previousTotal = sumInvoiceTotals(previousMonthLeads);
  const previousCommission =
    (previousTotal * Number(employee.commission)) / 100;

  // Two months ago
  const twoMonthsAgoLeads = await db.lead.findMany({
    where: { assignedSalesUserId: employee.id },
    include: {
      Client: {
        include: {
          Invoice: {
            where: {
              type: "Invoice",
              convertedAt: {
                gte: twoMonthsAgoStart,
                lte: twoMonthsAgoEnd,
              },
            },
          },
        },
      },
    },
  });

  for (const lead of twoMonthsAgoLeads) {
    if (lead.Client.length === 0 && lead.clientId) {
      let fallbackClient = await db.client.findFirst({
        where: {
          companyId,
          id: lead.clientId,
        },
        include: {
          Invoice: {
            where: {
              type: "Invoice",
              convertedAt: {
                gte: twoMonthsAgoStart,
                lte: twoMonthsAgoEnd,
              },
            },
          },
        },
      });
      fallbackClient && lead.Client.push(fallbackClient);
    }
  }

  const twoMonthsAgoTotal = sumInvoiceTotals(twoMonthsAgoLeads);
  const twoMonthsAgoCommission =
    (twoMonthsAgoTotal * Number(employee.commission)) / 100;

  // Growth rates
  const growthRateCurrent = growthRate(currentCommission, previousCommission);
  const growthRatePrevious = growthRate(
    previousCommission,
    twoMonthsAgoCommission,
  );

  // YTD
  const allLeads = await db.lead.findMany({
    where: { assignedSalesUserId: employee.id },
    include: {
      Client: {
        include: {
          Invoice: {
            where: { type: "Invoice" },
          },
        },
      },
    },
  });

  for (const lead of allLeads) {
    if (lead.Client.length === 0 && lead.clientId) {
      let fallbackClient = await db.client.findFirst({
        where: {
          companyId,
          id: lead.clientId,
        },
        include: {
          Invoice: {
            where: { type: "Invoice" },
          },
        },
      });
      fallbackClient && lead.Client.push(fallbackClient);
    }
  }

  const allTotal = sumInvoiceTotals(allLeads);
  const allCommission = (allTotal * Number(employee.commission)) / 100;

  return {
    employeeId: employee.id,
    currentCommission,
    previousCommission,
    twoMonthsAgoCommission,
    growthRateCurrent,
    growthRatePrevious,
    allCommission,
  };
}

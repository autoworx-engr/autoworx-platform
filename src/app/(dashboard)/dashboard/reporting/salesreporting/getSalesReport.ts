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

// export async function getSalesReportData(timezone: string) {
//   const currentuser = await getUser();
//   const companyId = await getCompanyId();

//   const employee = await db.user.findUnique({
//     where: { id: currentuser.id, companyId },
//   });

//   if (!employee) return notFound();

//   const {
//     currentMonthStart,
//     currentMonthEnd,
//     previousMonthStart,
//     previousMonthEnd,
//     twoMonthsAgoStart,
//     twoMonthsAgoEnd,
//   } = getDateRanges(timezone);

//   // Current month
//   const currentMonthLeads = await db.lead.findMany({
//     where: { assignedSalesUserId: employee.id },
//     include: {
//       Client: {
//         include: {
//           Invoice: {
//             where: {
//               type: "Invoice",
//               convertedAt: {
//                 gte: currentMonthStart,
//                 lte: currentMonthEnd,
//               },
//             },
//           },
//         },
//       },
//     },
//   });

//   for (const lead of currentMonthLeads) {
//     if (lead.Client.length === 0 && lead.clientId) {
//       let fallbackClient = await db.client.findFirst({
//         where: {
//           companyId,
//           id: lead.clientId,
//         },
//         include: {
//           Invoice: {
//             where: {
//               type: "Invoice",
//               convertedAt: {
//                 gte: currentMonthStart,
//                 lte: currentMonthEnd,
//               },
//             },
//           },
//         },
//       });
//       fallbackClient && lead.Client.push(fallbackClient);
//     }
//   }

//   const currentTotal = sumInvoiceTotals(currentMonthLeads);
//   const currentCommission = (currentTotal * Number(employee.commission)) / 100;

//   // Previous month
//   const previousMonthLeads = await db.lead.findMany({
//     where: { assignedSalesUserId: employee.id },
//     include: {
//       Client: {
//         include: {
//           Invoice: {
//             where: {
//               type: "Invoice",
//               convertedAt: {
//                 gte: previousMonthStart,
//                 lte: previousMonthEnd,
//               },
//             },
//           },
//         },
//       },
//     },
//   });

//   for (const lead of previousMonthLeads) {
//     if (lead.Client.length === 0 && lead.clientId) {
//       let fallbackClient = await db.client.findFirst({
//         where: {
//           companyId,
//           id: lead.clientId,
//         },
//         include: {
//           Invoice: {
//             where: {
//               type: "Invoice",
//               convertedAt: {
//                 gte: previousMonthStart,
//                 lte: previousMonthEnd,
//               },
//             },
//           },
//         },
//       });
//       fallbackClient && lead.Client.push(fallbackClient);
//     }
//   }

//   const previousTotal = sumInvoiceTotals(previousMonthLeads);
//   const previousCommission =
//     (previousTotal * Number(employee.commission)) / 100;

//   // Two months ago
//   const twoMonthsAgoLeads = await db.lead.findMany({
//     where: { assignedSalesUserId: employee.id },
//     include: {
//       Client: {
//         include: {
//           Invoice: {
//             where: {
//               type: "Invoice",
//               convertedAt: {
//                 gte: twoMonthsAgoStart,
//                 lte: twoMonthsAgoEnd,
//               },
//             },
//           },
//         },
//       },
//     },
//   });

//   for (const lead of twoMonthsAgoLeads) {
//     if (lead.Client.length === 0 && lead.clientId) {
//       let fallbackClient = await db.client.findFirst({
//         where: {
//           companyId,
//           id: lead.clientId,
//         },
//         include: {
//           Invoice: {
//             where: {
//               type: "Invoice",
//               convertedAt: {
//                 gte: twoMonthsAgoStart,
//                 lte: twoMonthsAgoEnd,
//               },
//             },
//           },
//         },
//       });
//       fallbackClient && lead.Client.push(fallbackClient);
//     }
//   }

//   const twoMonthsAgoTotal = sumInvoiceTotals(twoMonthsAgoLeads);
//   const twoMonthsAgoCommission =
//     (twoMonthsAgoTotal * Number(employee.commission)) / 100;

//   // Growth rates
//   const growthRateCurrent = growthRate(currentCommission, previousCommission);
//   const growthRatePrevious = growthRate(
//     previousCommission,
//     twoMonthsAgoCommission,
//   );

//   // YTD
//   const allLeads = await db.lead.findMany({
//     where: { assignedSalesUserId: employee.id },
//     include: {
//       Client: {
//         include: {
//           Invoice: {
//             where: { type: "Invoice" },
//           },
//         },
//       },
//     },
//   });

//   for (const lead of allLeads) {
//     if (lead.Client.length === 0 && lead.clientId) {
//       let fallbackClient = await db.client.findFirst({
//         where: {
//           companyId,
//           id: lead.clientId,
//         },
//         include: {
//           Invoice: {
//             where: { type: "Invoice" },
//           },
//         },
//       });
//       fallbackClient && lead.Client.push(fallbackClient);
//     }
//   }

//   const allTotal = sumInvoiceTotals(allLeads);
//   const allCommission = (allTotal * Number(employee.commission)) / 100;

//   return {
//     employeeId: employee.id,
//     currentCommission,
//     previousCommission,
//     twoMonthsAgoCommission,
//     growthRateCurrent,
//     growthRatePrevious,
//     allCommission,
//   };
// }

export async function getSalesReportData(
  timezone: string,
  startDate?: string,
  endDate?: string,
) {
  const currentUser = await getUser();
  const companyId = await getCompanyId();

  const employee = await db.user.findUnique({
    where: { id: currentUser.id, companyId },
    select: { id: true, commission: true },
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

  const allLeads = await db.lead.findMany({
    where: { assignedSalesUserId: employee.id },
    include: {
      Client: {
        include: {
          Invoice: {
            where: { type: "Invoice" },
            include: { column: { select: { title: true } } },
          },
        },
      },
    },
  });

  const leadsWithoutClients = allLeads.filter(
    (lead) => lead.Client.length === 0 && lead.clientId,
  );

  const clientIds = leadsWithoutClients.map((lead) => lead.clientId!);

  const fallbackClients =
    clientIds.length > 0
      ? await db.client.findMany({
          where: {
            companyId,
            id: { in: clientIds },
          },
          include: {
            Invoice: {
              where: { type: "Invoice" },
              include: { column: { select: { title: true } } },
            },
          },
        })
      : [];

  const clientMap = new Map(fallbackClients.map((c) => [c.id, c]));

  for (const lead of leadsWithoutClients) {
    const client = clientMap.get(lead.clientId!);
    if (client) {
      lead.Client.push(client);
    }
  }

  // If custom date range is provided, use it; otherwise use predefined ranges
  if (startDate && endDate) {
    const customStart = new Date(startDate);
    const customEnd = new Date(endDate);

    // length of the custom range in milliseconds
    const rangeMs = customEnd.getTime() - customStart.getTime();

    // previous range: immediately before custom range, same length
    const previousEnd = new Date(customStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - rangeMs);

    // two-periods-ago range: immediately before previous range
    const twoAgoEnd = new Date(previousStart.getTime() - 1);
    const twoAgoStart = new Date(twoAgoEnd.getTime() - rangeMs);

    const customRangeLeads = allLeads.map((lead) => ({
      ...lead,
      Client: lead.Client.map((client) => ({
        ...client,
        Invoice: client.Invoice.filter(
          (inv) =>
            inv.column?.title === "Delivered" &&
            inv.deliveredAt !== null &&
            inv.deliveredAt >= customStart &&
            inv.deliveredAt <= customEnd,
        ),
      })),
    }));

    const previousRangeLeads = allLeads.map((lead) => ({
      ...lead,
      Client: lead.Client.map((client) => ({
        ...client,
        Invoice: client.Invoice.filter(
          (inv) =>
            inv.column?.title === "Delivered" &&
            inv.deliveredAt !== null &&
            inv.deliveredAt >= previousStart &&
            inv.deliveredAt <= previousEnd,
        ),
      })),
    }));

    const twoAgoRangeLeads = allLeads.map((lead) => ({
      ...lead,
      Client: lead.Client.map((client) => ({
        ...client,
        Invoice: client.Invoice.filter(
          (inv) =>
            inv.column?.title === "Delivered" &&
            inv.deliveredAt !== null &&
            inv.deliveredAt >= twoAgoStart &&
            inv.deliveredAt <= twoAgoEnd,
        ),
      })),
    }));

    const customTotal = sumInvoiceTotals(customRangeLeads);
    const customCommission = (customTotal * Number(employee.commission)) / 100;

    const prevTotal = sumInvoiceTotals(previousRangeLeads);
    const prevCommission = (prevTotal * Number(employee.commission)) / 100;

    const prev2Total = sumInvoiceTotals(twoAgoRangeLeads);
    const prev2Commission = (prev2Total * Number(employee.commission)) / 100;

    const growthRateCurrent = growthRate(customCommission, prevCommission);
    const growthRatePrevious = growthRate(prevCommission, prev2Commission);

    return {
      employeeId: employee.id,
      currentCommission: customCommission,
      previousCommission: prevCommission,
      twoMonthsAgoCommission: prev2Commission,
      growthRateCurrent,
      growthRatePrevious,
      allCommission: customCommission,
    };
  }

  const currentMonthLeads = allLeads.map((lead) => ({
    ...lead,
    Client: lead.Client.map((client) => ({
      ...client,
      Invoice: client.Invoice.filter(
        (inv) =>
          inv.column?.title === "Delivered" &&
          inv.deliveredAt !== null &&
          inv.deliveredAt >= currentMonthStart &&
          inv.deliveredAt <= currentMonthEnd,
      ),
    })),
  }));

  const previousMonthLeads = allLeads.map((lead) => ({
    ...lead,
    Client: lead.Client.map((client) => ({
      ...client,
      Invoice: client.Invoice.filter(
        (inv) =>
          inv.column?.title === "Delivered" &&
          inv.deliveredAt !== null &&
          inv.deliveredAt >= previousMonthStart &&
          inv.deliveredAt <= previousMonthEnd,
      ),
    })),
  }));

  const twoMonthsAgoLeads = allLeads.map((lead) => ({
    ...lead,
    Client: lead.Client.map((client) => ({
      ...client,
      Invoice: client.Invoice.filter(
        (inv) =>
          inv.column?.title === "Delivered" &&
          inv.deliveredAt !== null &&
          inv.deliveredAt >= twoMonthsAgoStart &&
          inv.deliveredAt <= twoMonthsAgoEnd,
      ),
    })),
  }));

  // Calculations
  const currentTotal = sumInvoiceTotals(currentMonthLeads);
  const currentCommission = (currentTotal * Number(employee.commission)) / 100;

  const previousTotal = sumInvoiceTotals(previousMonthLeads);
  const previousCommission =
    (previousTotal * Number(employee.commission)) / 100;

  const twoMonthsAgoTotal = sumInvoiceTotals(twoMonthsAgoLeads);
  const twoMonthsAgoCommission =
    (twoMonthsAgoTotal * Number(employee.commission)) / 100;

  const growthRateCurrent = growthRate(currentCommission, previousCommission);
  const growthRatePrevious = growthRate(
    previousCommission,
    twoMonthsAgoCommission,
  );

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

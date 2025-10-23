import PayoutCard from "./PayoutCard";
import { getDateRanges, growthRate } from "@/actions/dashboard/data/lib";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Client, Invoice, Lead, User } from "@prisma/client";
import moment from "moment-timezone";

/**
 * Helper function to extract and sum invoice totals from lead data
 */
function sumInvoiceTotals(
  leads: (Lead & { Client: (Client & { Invoice: Invoice[] })[] })[]
): number {
  // Flatten out the nested structures to get all invoice grand totals
  const grandTotals = leads.flatMap((lead) =>
    lead.Client.flatMap((client) =>
      client.Invoice.map((invoice) => invoice.grandTotal)
    )
  );
  // Filter out null values and do the summation
  return grandTotals
    .filter((total) => total !== null)
    .reduce((acc, curr) => acc + (curr ? Number(curr) : 0), 0);
}

export default async function PayoutSales({
  employee,
  timezone,
}: {
  employee: User;
  timezone: string;
}) {
  // Get the company ID
  const companyId = await getCompanyId();
  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
    twoMonthsAgoEnd,
    twoMonthsAgoStart,
  } = getDateRanges(timezone);

  // Calculate year-to-date range using timezone
  const resolvedTimezone = timezone;
  const now = moment.tz(resolvedTimezone);
  const yearStart = now.clone().startOf("year").startOf("day").toDate();
  const yearEnd = now.clone().endOf("year").endOf("day").toDate();
  // Fetch leads with completed invoices for the current month
  const currentMonthCompletedInvoiceLeads = await db.lead.findMany({
    where: {
      companyId,
      assignedSalesUserId: employee.id,
      column: {
        title: "Converted",
      },
      assignedDate: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
    include: {
      Client: {
        include: {
          Invoice: {
            where: {
              type: "Invoice",
            },
          },
        },
      },
    },
  });

  for (const lead of currentMonthCompletedInvoiceLeads) {
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
            },
          },
        },
      });
      fallbackClient && lead.Client.push(fallbackClient);
    }
  }

  // Compute the total invoice sum for current month
  const total = sumInvoiceTotals(currentMonthCompletedInvoiceLeads);
  // Calculate commission for current month (handle null/undefined commission)
  const employeeCommissionRate = Number(employee.commission) || 0;
  const commission = (total * employeeCommissionRate) / 100;

  // Fetch leads with completed invoices for the previous month
  const previousMonthCompletedInvoiceLeads = await db.lead.findMany({
    where: {
      companyId,
      assignedSalesUserId: employee.id,
      column: {
        title: "Converted",
      },
      assignedDate: {
        gte: previousMonthStart,
        lte: previousMonthEnd,
      },
    },
    include: {
      Client: {
        include: {
          Invoice: {
            where: {
              type: "Invoice",
            },
          },
        },
      },
    },
  });

  for (const lead of previousMonthCompletedInvoiceLeads) {
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
            },
          },
        },
      });
      fallbackClient && lead.Client.push(fallbackClient);
    }
  }

  // Compute the total invoice sum for previous month
  const previousTotal = sumInvoiceTotals(previousMonthCompletedInvoiceLeads);
  // Calculate commission for previous month
  const previousCommission = (previousTotal * employeeCommissionRate) / 100;

  // Fetch leads with completed invoices for two months ago
  const twoMonthsAgoCompletedInvoiceLeads = await db.lead.findMany({
    where: {
      companyId,
      assignedSalesUserId: employee.id,
      column: {
        title: "Converted",
      },
      assignedDate: {
        gte: twoMonthsAgoStart,
        lte: twoMonthsAgoEnd,
      },
    },
    include: {
      Client: {
        include: {
          Invoice: {
            where: {
              type: "Invoice",
            },
          },
        },
      },
    },
  });

  for (const lead of twoMonthsAgoCompletedInvoiceLeads) {
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
            },
          },
        },
      });
      fallbackClient && lead.Client.push(fallbackClient);
    }
  }

  // Compute the total invoice sum for two months ago
  const twoMonthsAgoTotal = sumInvoiceTotals(twoMonthsAgoCompletedInvoiceLeads);
  // Calculate commission for two months ago
  const twoMonthsAgoCommission =
    (twoMonthsAgoTotal * employeeCommissionRate) / 100;

  // Calculate growth rate for current month compared to previous month
  const growthRateCurrent = growthRate(commission, previousCommission);
  // Calculate growth rate for previous month compared to two months ago
  const growthRatePrevious = growthRate(
    previousCommission,
    twoMonthsAgoCommission
  );

  // Fetch all leads with completed invoices for Year-to-Date
  const allCompletedInvoiceLeads = await db.lead.findMany({
    where: {
      companyId,
      assignedSalesUserId: employee.id,
      column: {
        title: "Converted",
      },
      assignedDate: {
        gte: yearStart,
        lte: yearEnd,
      },
    },
    include: {
      Client: {
        include: {
          Invoice: {
            where: {
              type: "Invoice",
            },
          },
        },
      },
    },
  });

  for (const lead of allCompletedInvoiceLeads) {
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
            },
          },
        },
      });
      fallbackClient && lead.Client.push(fallbackClient);
    }
  }

  // Compute the total invoice sum for all completed leads (YTD)
  const allTotal = sumInvoiceTotals(allCompletedInvoiceLeads);
  // Calculate commission for all completed leads (YTD)
  const allCommission = (allTotal * employeeCommissionRate) / 100;

  // Render payout cards
  return (
    <div className="w-full grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-6">
      <PayoutCard
        title="Previous Month Payout"
        amount={previousCommission}
        percentage={growthRatePrevious.rate}
        increased={growthRatePrevious.isPositive}
      />
      <PayoutCard
        title="Current Month Payout"
        amount={commission}
        percentage={growthRateCurrent.rate}
        increased={growthRateCurrent.isPositive}
      />
      <PayoutCard title="YTD Payout" amount={allCommission} hidePercentage />
    </div>
  );
}

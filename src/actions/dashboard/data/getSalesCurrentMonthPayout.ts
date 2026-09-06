"use server";

import { getDateRanges, growthRate } from "@/actions/dashboard/data/lib";
import { db } from "@/lib/db";
import { Client, Invoice, Lead } from "@prisma/client";

type LeadWithInvoices = Lead & { Client: (Client & { Invoice: Invoice[] })[] };

/**
 * Sum invoice grand totals from the nested lead → client → invoice structure.
 * Mirrors the helper used by the sales reporting page.
 */
function sumInvoiceTotals(leads: LeadWithInvoices[]): number {
  return leads
    .flatMap((lead) =>
      lead.Client.flatMap((client) =>
        client.Invoice.map((invoice) => invoice.grandTotal),
      ),
    )
    .filter((total) => total !== null)
    .reduce((acc, curr) => acc + (curr ? Number(curr) : 0), 0);
}

/** Commission earned on invoices converted inside the given window. */
function commissionInRange(
  leads: LeadWithInvoices[],
  commissionRate: number,
  start: Date,
  end: Date,
): number {
  const inRange = leads.map((lead) => ({
    ...lead,
    Client: lead.Client.map((client) => ({
      ...client,
      Invoice: client.Invoice.filter(
        (inv) =>
          inv.convertedAt !== null &&
          inv.convertedAt >= start &&
          inv.convertedAt <= end,
      ),
    })),
  }));

  return (sumInvoiceTotals(inRange) * commissionRate) / 100;
}

/**
 * Current month payout for a salesperson — the same figure the
 * "Current Month Payout" card shows on /dashboard/reporting/salesreporting.
 *
 * Session-free variant of `getSalesReportData` (which relies on getUser() /
 * getCompanyId()) so the JWT-authenticated mobile dashboard route can call it
 * with an explicit user and company.
 */
export async function getSalesCurrentMonthPayout(
  timezone: string,
  userId: number,
  companyId: number,
) {
  const employee = await db.user.findUnique({
    where: { id: userId, companyId },
    select: { id: true, commission: true },
  });

  if (!employee) {
    return { currentMonthPayout: 0, growth: { rate: 0, isPositive: true } };
  }

  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);

  const leads = await db.lead.findMany({
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

  // A lead can point at a client without the relation being populated —
  // backfill those so their invoices still count.
  const leadsWithoutClients = leads.filter(
    (lead) => lead.Client.length === 0 && lead.clientId,
  );
  const clientIds = leadsWithoutClients.map((lead) => lead.clientId!);

  if (clientIds.length > 0) {
    const fallbackClients = await db.client.findMany({
      where: { companyId, id: { in: clientIds } },
      include: {
        Invoice: {
          where: { type: "Invoice" },
        },
      },
    });
    const clientMap = new Map(fallbackClients.map((c) => [c.id, c]));

    for (const lead of leadsWithoutClients) {
      const client = clientMap.get(lead.clientId!);
      if (client) lead.Client.push(client);
    }
  }

  const commissionRate = Number(employee.commission) || 0;

  const currentMonthPayout = commissionInRange(
    leads,
    commissionRate,
    currentMonthStart,
    currentMonthEnd,
  );
  const previousMonthPayout = commissionInRange(
    leads,
    commissionRate,
    previousMonthStart,
    previousMonthEnd,
  );

  return {
    currentMonthPayout,
    growth: growthRate(currentMonthPayout, previousMonthPayout),
  };
}

import { db } from "@/lib/db";

const invoiceInclude = {
  where: { type: "Invoice" as const },
  include: { column: { select: { title: true } } },
};

type AssignedInvoice = {
  grandTotal: any;
  deliveredAt: Date | null;
  column: { title: string } | null;
};

/**
 * Every invoice belonging to leads assigned to this sales user.
 * Leads whose Client rows aren't nested under them are merged back in, matching
 * the sales report — without it those invoices silently drop out of commission.
 */
export async function getSalesAssignedInvoices(
  userId: number,
  companyId: number,
): Promise<AssignedInvoice[]> {
  const leads = await db.lead.findMany({
    where: { assignedSalesUserId: userId },
    include: { Client: { include: { Invoice: invoiceInclude } } },
  });

  const leadsWithoutClients = leads.filter(
    (lead) => lead.Client.length === 0 && lead.clientId,
  );
  const clientIds = leadsWithoutClients.map((lead) => lead.clientId!);

  if (clientIds.length > 0) {
    const fallbackClients = await db.client.findMany({
      where: { companyId, id: { in: clientIds } },
      include: { Invoice: invoiceInclude },
    });
    const clientMap = new Map(fallbackClients.map((c) => [c.id, c]));

    for (const lead of leadsWithoutClients) {
      const client = clientMap.get(lead.clientId!);
      if (client) lead.Client.push(client as any);
    }
  }

  return leads.flatMap((lead) => lead.Client.flatMap((c) => c.Invoice));
}

export function commissionForRange(
  invoices: AssignedInvoice[],
  commissionRate: any,
  start: Date,
  end: Date,
): number {
  const total = invoices
    .filter(
      (inv) =>
        inv.column?.title === "Delivered" &&
        inv.deliveredAt !== null &&
        inv.deliveredAt >= start &&
        inv.deliveredAt <= end,
    )
    .reduce((sum, inv) => sum + Number(inv.grandTotal ?? 0), 0);

  return parseFloat(((total * Number(commissionRate ?? 0)) / 100).toFixed(2));
}

export async function getCommissionBreakdown(
  userId: number,
  companyId: number,
  ranges: {
    currentMonthStart: Date;
    currentMonthEnd: Date;
    previousMonthStart: Date;
    previousMonthEnd: Date;
    twoMonthsAgoStart: Date;
    twoMonthsAgoEnd: Date;
    yearStart: Date;
    yearEnd: Date;
  },
) {
  const employee = await db.user.findUnique({
    where: { id: userId },
    select: { commission: true },
  });

  if (!employee?.commission) {
    return { current: 0, previous: 0, secondPrevious: 0, total: 0 };
  }

  const invoices = await getSalesAssignedInvoices(userId, companyId);
  const rate = employee.commission;

  return {
    current: commissionForRange(
      invoices,
      rate,
      ranges.currentMonthStart,
      ranges.currentMonthEnd,
    ),
    previous: commissionForRange(
      invoices,
      rate,
      ranges.previousMonthStart,
      ranges.previousMonthEnd,
    ),
    secondPrevious: commissionForRange(
      invoices,
      rate,
      ranges.twoMonthsAgoStart,
      ranges.twoMonthsAgoEnd,
    ),
    total: commissionForRange(invoices, rate, ranges.yearStart, ranges.yearEnd),
  };
}

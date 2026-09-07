"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ShopLead } from "@/types/invoiceLead";
import { getCompanyTimezone } from "../settings/getCompanyTimezone";
import {
  assignedTechnicianFilter,
  makeInclude,
  makeSearchCondition,
  toShopLead,
} from "./_workOrderShape";

export async function getWorkOrdersByColumn(
  columnId: number,
  skip: number,
  take: number,
  filterByUserId?: number,
  search?: string,
) {
  const companyId = await getCompanyId();
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;

  const baseWhere = {
    companyId,
    columnId,
    type: "Invoice" as const,
    isWorkOrder: true,
  };

  const andConditions: any[] = [];

  if (filterByUserId) {
    andConditions.push(assignedTechnicianFilter(filterByUserId, companyId));
  }

  const searchCondition = makeSearchCondition(search);
  if (searchCondition) andConditions.push(searchCondition);

  const where =
    andConditions.length > 0 ? { ...baseWhere, AND: andConditions } : baseWhere;

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: makeInclude(timezone),
      orderBy: [{ deliveredAt: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    db.invoice.count({ where }),
  ]);

  return {
    leads: invoices.map(toShopLead),
    total,
    hasMore: skip + take < total,
  };
}

export async function getWorkOrdersByTechnician(
  technicianId: number,
  skip: number,
  take: number,
  filterByUserId?: number,
  search?: string,
) {
  const companyId = await getCompanyId();
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;

  const andConditions: any[] = [
    assignedTechnicianFilter(technicianId, companyId),
  ];

  if (filterByUserId) {
    andConditions.push(assignedTechnicianFilter(filterByUserId, companyId));
  }

  const searchCondition = makeSearchCondition(search);
  if (searchCondition) andConditions.push(searchCondition);

  const where = {
    companyId,
    type: "Invoice" as const,
    isWorkOrder: true,
    AND: andConditions,
  };

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: makeInclude(timezone),
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.invoice.count({ where }),
  ]);

  return {
    leads: invoices.map(toShopLead),
    total,
    hasMore: skip + take < total,
  };
}

const TEAM_SEARCH_PAGE_SIZE = 10;

export async function getWorkOrdersForTeamSearch(
  technicianUserIds: number[],
  search: string,
  filterByUserId?: number,
) {
  const empty = new Map<
    number,
    { leads: ShopLead[]; total: number; hasMore: boolean }
  >();
  if (!technicianUserIds.length) return empty;

  const companyId = await getCompanyId();
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;

  const techIdSet = new Set(technicianUserIds);

  const andConditions: any[] = [
    assignedTechnicianFilter({ in: technicianUserIds }, companyId),
  ];

  if (filterByUserId) {
    andConditions.push(assignedTechnicianFilter(filterByUserId, companyId));
  }

  const searchCondition = makeSearchCondition(search);
  if (searchCondition) andConditions.push(searchCondition);

  const invoices = await db.invoice.findMany({
    where: {
      companyId,
      type: "Invoice" as const,
      isWorkOrder: true,
      AND: andConditions,
    },
    include: makeInclude(timezone),
    orderBy: [{ deliveredAt: "desc" }, { createdAt: "desc" }],
  });

  // Group invoices by technician userId — an invoice can appear in multiple columns
  const grouped = new Map<number, ShopLead[]>();
  for (const userId of technicianUserIds) grouped.set(userId, []);

  for (const invoice of invoices) {
    const lead = toShopLead(invoice);
    const assignedIds = new Set<number>();
    for (const tech of invoice.technician) {
      if (techIdSet.has(tech.userId)) assignedIds.add(tech.userId);
    }
    for (const uid of assignedIds) grouped.get(uid)!.push(lead);
  }

  const result = new Map<
    number,
    { leads: ShopLead[]; total: number; hasMore: boolean }
  >();
  for (const [uid, leads] of grouped) {
    result.set(uid, {
      leads: leads.slice(0, TEAM_SEARCH_PAGE_SIZE),
      total: leads.length,
      hasMore: leads.length > TEAM_SEARCH_PAGE_SIZE,
    });
  }
  return result;
}

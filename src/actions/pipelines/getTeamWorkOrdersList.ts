"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { EmployeeType } from "@prisma/client";
import { getCompanyTimezone } from "../settings/getCompanyTimezone";
import {
  makeInclude,
  makeSearchCondition,
  toShopLead,
} from "./_workOrderShape";

// Flat, single-column counterpart to getWorkOrdersByTechnician: every work order
// that has at least one technician assigned in this company, listed once rather
// than duplicated across a column per technician.
export async function getTeamWorkOrdersList(
  skip: number,
  take: number,
  employeeType?: EmployeeType,
  filterByUserId?: number,
  search?: string,
) {
  const companyId = await getCompanyId();
  const companyTimezone = await getCompanyTimezone();
  const timezone = companyTimezone?.timezone;

  const assignedFilter = {
    technician: {
      some: {
        companyId,
        ...(filterByUserId && { userId: filterByUserId }),
        ...(employeeType && { user: { employeeType } }),
      },
    },
  };

  const andConditions: any[] = [assignedFilter];

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

import type { Prisma } from "@prisma/client";

/** Active CRM rows (not archived). */
export const activeDealWhere = {
  deletedAt: null,
} satisfies Prisma.DealWhereInput;

export const activeAccountWhere = {
  deletedAt: null,
} satisfies Prisma.CrmAccountWhereInput;

export const activeContactWhere = {
  deletedAt: null,
} satisfies Prisma.ContactWhereInput;

export const activeProductWhere = {
  deletedAt: null,
} satisfies Prisma.ProductWhereInput;

export const activeInvoiceWhere = {
  deletedAt: null,
} satisfies Prisma.InvoiceWhereInput;

"use server";
import { db } from "./db";
import { InvoiceType, Prisma } from "@prisma/client";
import moment from "moment-timezone";

const defaultTake = 50;

export async function fetchAndTransformData(
  type: InvoiceType,
  companyId: number,
  searchParams: {
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: string;
    searchTerm?: string;
    take?: string;
  } = {},
  timezone: string,
) {
  const page = Number(searchParams.page) || 1;
  const take = Number(searchParams.take) || defaultTake;
  const offset = (page - 1) * take;

  const { startDate, endDate, status, searchTerm } = searchParams;

  const convertedStart = startDate
    ? moment.tz(startDate, "YYYY-MM-DD", timezone).startOf("day").toDate()
    : null;
  const convertedEnd = endDate
    ? moment.tz(endDate, "YYYY-MM-DD", timezone).endOf("day").toDate()
    : null;

  const decodedStatus = decodeURIComponent(status || "");

  const statusIds = decodedStatus
    ? decodedStatus
        .split(",")
        .map((id) => (isNaN(Number(id)) ? undefined : Number(id)))
        .filter((id): id is number => id !== undefined)
    : undefined;

  const decodedSearchTerm = decodeURIComponent(searchTerm || "").trim();

  const dateFilter =
    convertedStart && convertedEnd
      ? Prisma.sql`AND (i."created_at" BETWEEN ${convertedStart} AND ${convertedEnd})`
      : Prisma.empty;

  const statusFilter =
    statusIds && statusIds.length > 0
      ? Prisma.sql`AND i."column_id" IN (${Prisma.join(statusIds)})`
      : Prisma.empty;

  const searchPattern = decodedSearchTerm
    ? `%${decodedSearchTerm.replace(/\s+/g, " ")}%`
    : null;

  // Match each typed word against first/last name independently (in either
  // field, any order) so "ade ekram", "ekram", or extra whitespace in the
  // stored name all still match "Ekram Ade" - not just an exact,
  // contiguous "first_name last_name" substring.
  const nameWords = decodedSearchTerm.split(/\s+/).filter(Boolean);
  const nameCondition =
    nameWords.length > 0
      ? Prisma.sql`(${Prisma.join(
          nameWords.map(
            (word) =>
              Prisma.sql`(c."first_name" ILIKE ${`%${word}%`} OR c."last_name" ILIKE ${`%${word}%`})`,
          ),
          " AND ",
        )})`
      : Prisma.sql`FALSE`;

  const searchFilter = searchPattern
    ? Prisma.sql`
      AND (
        i.id::text ILIKE ${searchPattern}
        OR ${nameCondition}
        OR c.email ILIKE ${searchPattern}
        OR c.mobile ILIKE ${searchPattern}
        OR v.make ILIKE ${searchPattern}
        OR v.model ILIKE ${searchPattern}
        OR CAST(v.year AS TEXT) ILIKE ${searchPattern}
        OR col.title ILIKE ${searchPattern}
        OR CONCAT(CAST(v.year AS TEXT), ' ', v.make, ' ', v.model) ILIKE ${searchPattern}
        OR CONCAT(v.make, ' ', CAST(v.year AS TEXT), ' ', v.model) ILIKE ${searchPattern}
        OR CONCAT(v.model, ' ', CAST(v.year AS TEXT), ' ', v.make) ILIKE ${searchPattern}
      )
    `
    : Prisma.empty;

  const paginationClause = decodedSearchTerm
    ? Prisma.empty
    : Prisma.sql`LIMIT ${take} OFFSET ${offset}`;

  const joins = Prisma.sql`
    FROM "Invoice" i
    LEFT JOIN "Client" c ON i."customer_id" = c.id
    LEFT JOIN "Vehicle" v ON i."vehicle_id" = v.id
    LEFT JOIN "Column" col ON i."column_id" = col.id
  `;

  const baseWhere = Prisma.sql`
    WHERE i."company_id" = ${companyId}
      AND i.type::text = ${type}
      ${dateFilter}
      ${statusFilter}
      ${searchFilter}
  `;

  const query = Prisma.sql`
    SELECT
      i.id,
      i."created_at" AS "createdAt",
      i."delivered_at" AS "deliveredAt",
      i."grand_total" AS "grandTotal",
      i."customer_id" AS "clientId",
      CONCAT(c."first_name", ' ', c."last_name") AS "clientName",
      c.email,
      c.mobile AS phone,
      v.make,
      v.model,
      v.year,
      col.title AS status,
      col."textColor",
      col."bgColor",
      i."is_shop_booking" AS "isShopBooking"
    ${joins}
    ${baseWhere}
    ORDER BY i."updated_at" DESC
    ${paginationClause}
  `;

  const countQuery = Prisma.sql`
    SELECT COUNT(*)::int AS total
    ${joins}
    ${baseWhere}
  `;

  const data = await db.$queryRaw<any>(query);
  const totalResult = await db.$queryRaw<{ total: number }[]>(countQuery);
  const totalEstimate = Number(totalResult[0]?.total || 0);

  return {
    totalEstimate,
    data: data?.map((item: any) => ({
      id: item.id,
      clientId: item.clientId ?? null,
      clientName: item.clientName?.trim() || "",
      vehicle: [item.year, item.make, item.model].filter(Boolean).join(" "),
      email: item.email || "",
      phone: item.phone || "",
      grandTotal: Number(item.grandTotal || 0),
      createdAt: item.createdAt,
      status: item.status,
      textColor: item.textColor,
      bgColor: item.bgColor,
      deliveredAt: item.deliveredAt,
      isShopBooking: item.isShopBooking,
    })),
  };
}

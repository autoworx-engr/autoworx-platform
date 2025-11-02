"use server";
import { getStatusPriority } from "@/utils/getStatusPriority";
import { db } from "./db";
import { InvoiceType } from "@prisma/client";
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
  timezone: string
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
        .map((id) => {
          if (isNaN(Number(id))) {
            return undefined;
          } else {
            return Number(id);
          }
        })
        .filter((id) => id !== undefined)
    : undefined;

  const decodedSearchTerm = decodeURIComponent(searchTerm || "").trim();

  const dateFilter =
    convertedStart && convertedEnd
      ? `AND (i."created_at" BETWEEN '${convertedStart.toISOString()}' AND '${convertedEnd.toISOString()}')`
      : "";

  const statusFilter =
    statusIds && statusIds.length > 0
      ? `AND i."column_id" IN (${statusIds.join(",")})`
      : "";

  const searchFilter = decodedSearchTerm
    ? `
    AND (
      i.id::text ILIKE '%${decodedSearchTerm}%'
      OR LOWER(CONCAT(c."first_name", ' ', c."last_name")) ILIKE LOWER('%${decodedSearchTerm}%')
      OR c.email ILIKE '%${decodedSearchTerm}%'
      OR c.mobile ILIKE '%${decodedSearchTerm}%'
      OR v.make ILIKE '%${decodedSearchTerm}%'
      OR v.model ILIKE '%${decodedSearchTerm}%'
      OR CAST(v.year AS TEXT) ILIKE '%${decodedSearchTerm}%'
      OR col.title ILIKE '%${decodedSearchTerm}%'
    )
  `
    : "";

  const query = `
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
      col."bgColor"
    FROM "Invoice" i
    LEFT JOIN "Client" c ON i."customer_id" = c.id
    LEFT JOIN "Vehicle" v ON i."vehicle_id" = v.id
    LEFT JOIN "Column" col ON i."column_id" = col.id
    WHERE i."company_id" = ${companyId}
      AND i.type = '${type}'
      ${dateFilter}
      ${statusFilter}
      ${searchFilter}
    ORDER BY i."created_at" DESC
    LIMIT ${take} OFFSET ${offset};
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM "Invoice" i
    LEFT JOIN "Client" c ON i."customer_id" = c.id
    LEFT JOIN "Vehicle" v ON i."vehicle_id" = v.id
    LEFT JOIN "Column" col ON i."column_id" = col.id
    WHERE i."company_id" = ${companyId}
      AND i.type = '${type}'
      ${dateFilter}
      ${statusFilter}
      ${searchFilter};
  `;

  const data = await db.$queryRawUnsafe<any>(query);
  const totalResult = await db.$queryRawUnsafe<{ total: number }[]>(countQuery);
  const totalEstimate = Number(totalResult[0]?.total || 0);

  const sortedData = data.sort(
    (a: { status: string }, b: { status: string }) =>
      getStatusPriority(a?.status) - getStatusPriority(b?.status)
  );

  return {
    totalEstimate,
    data: sortedData?.map((item: any) => ({
      id: item.id,
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
    })),
  };
}

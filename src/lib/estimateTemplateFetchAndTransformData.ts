"use server";
import { getStatusPriority } from "@/utils/getStatusPriority";
import { db } from "./db";
import moment from "moment-timezone";

const defaultTake = 50;

export async function estimateTemplateFetchAndTransformData(
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
      OR i.title::text ILIKE '%${decodedSearchTerm}%'
    )
  `
    : "";

  const paginationClause = decodedSearchTerm
    ? ""
    : `LIMIT ${take} OFFSET ${offset}`;

  const query = `
    SELECT
      i.id,
      i.title,
      i."created_at" AS "createdAt",
      i."grand_total" AS "grandTotal",
      col.title AS status,
      col."textColor",
      col."bgColor"
    FROM "InvoiceTemplate" i
    LEFT JOIN "Column" col ON i."column_id" = col.id
    WHERE i."company_id" = ${companyId}
      ${dateFilter}
      ${statusFilter}
      ${searchFilter}
    ORDER BY i."created_at" DESC
    ${paginationClause};
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM "InvoiceTemplate" i
    LEFT JOIN "Column" col ON i."column_id" = col.id
    WHERE i."company_id" = ${companyId}
      ${dateFilter}
      ${statusFilter}
      ${searchFilter};
  `;

  const data = await db.$queryRawUnsafe<any>(query);
  const totalResult = await db.$queryRawUnsafe<{ total: number }[]>(countQuery);
  const totalEstimate = Number(totalResult[0]?.total || 0);

  const sortedData = data.sort(
    (a: { status: string }, b: { status: string }) =>
      getStatusPriority(a?.status) - getStatusPriority(b?.status),
  );

  return {
    totalEstimate,
    data: sortedData?.map((item: any) => ({
      id: item.id,
      title: item.title,
      grandTotal: Number(item.grandTotal || 0),
      createdAt: item.createdAt,
      status: item.status,
      textColor: item.textColor,
      bgColor: item.bgColor,
    })),
  };
}

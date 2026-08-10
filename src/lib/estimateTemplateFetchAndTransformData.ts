"use server";
import { getStatusPriority } from "@/utils/getStatusPriority";
import { db } from "./db";
import { Prisma } from "@prisma/client";
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

  // Match each typed word against the title independently (any order) so
  // extra whitespace or reordered words still match, not just an exact,
  // contiguous substring of the title.
  const titleWords = decodedSearchTerm.split(/\s+/).filter(Boolean);
  const titleCondition =
    titleWords.length > 0
      ? Prisma.sql`(${Prisma.join(
          titleWords.map((word) => Prisma.sql`i.title ILIKE ${`%${word}%`}`),
          " AND ",
        )})`
      : Prisma.sql`FALSE`;

  const searchFilter = searchPattern
    ? Prisma.sql`
      AND (
        i.id::text ILIKE ${searchPattern}
        OR ${titleCondition}
      )
    `
    : Prisma.empty;

  const paginationClause = decodedSearchTerm
    ? Prisma.empty
    : Prisma.sql`LIMIT ${take} OFFSET ${offset}`;

  const joins = Prisma.sql`
    FROM "InvoiceTemplate" i
    LEFT JOIN "Column" col ON i."column_id" = col.id
  `;

  const baseWhere = Prisma.sql`
    WHERE i."company_id" = ${companyId}
      ${dateFilter}
      ${statusFilter}
      ${searchFilter}
  `;

  const query = Prisma.sql`
    SELECT
      i.id,
      i.title,
      i."created_at" AS "createdAt",
      i."grand_total" AS "grandTotal",
      col.title AS status,
      col."textColor",
      col."bgColor"
    ${joins}
    ${baseWhere}
    ORDER BY i."created_at" DESC
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

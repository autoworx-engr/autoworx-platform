import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_SORT_FIELDS = new Set(["name", "createdAt", "updatedAt"]);
const ALLOWED_SORT_ORDERS = new Set(["asc", "desc"]);

export async function listGroupsHandler(req: NextRequest) {
  try {
    const principal = await getAuthPrincipal(req);
    if (!principal) throw new AppError(401, "Unauthorized");

    const searchParams = req.nextUrl.searchParams;

    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");
    const search = (searchParams.get("search") || "").trim();
    const sortByRaw = searchParams.get("sortBy") || "updatedAt";
    const sortOrderRaw = searchParams.get("sortOrder") || "desc";
    const sortBy = ALLOWED_SORT_FIELDS.has(sortByRaw) ? sortByRaw : "updatedAt";
    const sortOrder = ALLOWED_SORT_ORDERS.has(sortOrderRaw)
      ? (sortOrderRaw as "asc" | "desc")
      : "desc";

    // Legacy groups can have companyId = null. Membership filter enforces
    // tenant isolation since users belong to exactly one company.
    const where: Prisma.GroupWhereInput = {
      OR: [{ companyId: principal.companyId }, { companyId: null }],
      users: { some: { id: principal.userId } },
    };

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    const [groups, totalGroups] = await Promise.all([
      db.group.findMany({
        where,
        include: { users: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      db.group.count({ where }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: groups,
        message: "Groups fetched successfully",
        meta: {
          totalRecords: totalGroups,
          page: pageNum,
          limit: limitNum,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const errors = errorHandler(error);
    const message = errors?.message || "Internal Server Error";
    const status = errors?.statusCode || 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

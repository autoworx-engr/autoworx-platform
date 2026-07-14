import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/internal/group/{groupId}/members:
 *   get:
 *     summary: Retrieve a paginated list of members for a group
 *     tags: [Internal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the group
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of members per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search members by first name, last name, or email
 *     responses:
 *       200:
 *         description: Group members fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 */
export const GET = async (
  request: NextRequest,
  props: { params: Promise<{ groupId: string }> },
) => {
  try {
    const principal = await getAuthPrincipal(request);
    if (!principal) throw new AppError(401, "Unauthorized");

    const { groupId } = await props.params;
    const groupIdNum = parseInt(groupId, 10);
    if (Number.isNaN(groupIdNum)) throw new AppError(400, "Invalid group ID");

    const searchParams = request.nextUrl.searchParams;
    const search = (searchParams.get("search") || "").trim();
    const pageNum = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limitNum = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const skip = (pageNum - 1) * limitNum;

    // Membership check enforces tenant isolation; legacy groups can have
    // companyId = null, so match those too as long as the caller belongs.
    const group = await db.group.findFirst({
      where: {
        id: groupIdNum,
        OR: [{ companyId: principal.companyId }, { companyId: null }],
        users: { some: { id: principal.userId } },
      },
      select: { id: true },
    });
    if (!group) throw new AppError(404, "Group not found");

    // Same search predicate drives both count and findMany so meta.totalRecords
    // and data can never disagree under search.
    const searchWords = search ? search.split(/\s+/) : [];
    const buildSearchWhere = (): Prisma.UserWhereInput => {
      if (!search) return {};
      const conditions: Prisma.UserWhereInput[] = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
      for (let i = 1; i < searchWords.length; i++) {
        const firstPart = searchWords.slice(0, i).join(" ");
        const lastPart = searchWords.slice(i).join(" ");
        conditions.push({
          AND: [
            { firstName: { contains: firstPart, mode: "insensitive" } },
            { lastName: { contains: lastPart, mode: "insensitive" } },
          ],
        });
      }
      return { OR: conditions };
    };

    const where: Prisma.UserWhereInput = {
      groups: { some: { id: groupIdNum } },
      ...buildSearchWhere(),
    };

    const userSelect = {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      image: true,
      employeeType: true,
    } as const;

    const [totalRecords, members] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        orderBy: { firstName: "asc" },
        skip,
        take: limitNum,
        select: userSelect,
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limitNum);

    return NextResponse.json(
      {
        success: true,
        data: members,
        message: "Group members fetched successfully",
        meta: {
          totalRecords,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage: pageNum * limitNum < totalRecords,
          hasPrevPage: pageNum > 1,
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
};

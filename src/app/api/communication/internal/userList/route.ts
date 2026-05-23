import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/internal/userList:
 *   get:
 *     summary: Retrieve a list of users for a specific company, sorted by latest message
 *     tags: [Internal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the company
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
 *         description: Number of records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by first name, last name, or email
 *
 *     responses:
 *       200:
 *         description: Successfully retrieved user list sorted by latest message
 *       400:
 *         description: Company ID is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Company not found
 */

export const GET = async (request: NextRequest) => {
  try {
    const principal = await getAuthPrincipal(request);
    if (!principal) throw new AppError(401, "Unauthorized");

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const pageNum = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limitNum = Math.max(1, parseInt(searchParams.get("limit") || "20"));

    const userIdNum = principal.userId;
    const where: Prisma.UserWhereInput = {
      NOT: { id: userIdNum },
      companyId: principal.companyId,
    };

    if (search) {
      const searchWords = search.trim().split(/\s+/);
      const conditions: Prisma.UserWhereInput[] = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];

      if (searchWords.length > 1) {
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
      }

      where.OR = conditions;
    }

    // Pagination + ordering live entirely in SQL. We sort by the viewer's
    // latest internal chatTrack with each user (newest activity first, then
    // never-chatted users fall to the bottom via NULLS LAST).
    //
    // Two queries:
    //   1. Raw: get the ordered, paginated set of user ids for this page.
    //   2. Hydrate: batch-fetch the user rows + their latest chatTrack with
    //      the viewer, then re-attach in the original order.
    const skip = (pageNum - 1) * limitNum;

    // Build the search predicate as a Prisma where for re-use by `count` and
    // the row hydration. The raw query inlines its own search SQL below to
    // keep the join + order on one statement.
    const orderedRows = await db.$queryRaw<
      { id: number; track_updated_at: Date | null }[]
    >`
      SELECT u.id, t.track_updated_at
      FROM "User" u
      LEFT JOIN LATERAL (
        SELECT ct.updated_at AS track_updated_at
        FROM "ChatTrack" ct
        WHERE ct.section::text = 'internal'
          AND (
            (ct.sender_id = ${userIdNum} AND ct.receiver_id = u.id)
            OR (ct.receiver_id = ${userIdNum} AND ct.sender_id = u.id)
          )
        ORDER BY ct.updated_at DESC
        LIMIT 1
      ) t ON true
      WHERE u.company_id = ${principal.companyId}
        AND u.id <> ${userIdNum}
        ${
          search
            ? Prisma.sql`AND (
                u.first_name ILIKE ${"%" + search + "%"}
                OR u.last_name ILIKE ${"%" + search + "%"}
                OR u.email ILIKE ${"%" + search + "%"}
              )`
            : Prisma.empty
        }
      ORDER BY t.track_updated_at DESC NULLS LAST, u.id ASC
      OFFSET ${skip} LIMIT ${limitNum}
    `;

    const totalRow = await db.user.count({ where });
    const totalRecords = totalRow;

    const idsInOrder = orderedRows.map((r) => r.id);
    let paginatedUsers: Array<
      Prisma.UserGetPayload<{
        select: {
          id: true;
          firstName: true;
          lastName: true;
          email: true;
          phone: true;
          image: true;
          employeeType: true;
        };
      }> & { chatTrack: Prisma.ChatTrackGetPayload<{}> | null }
    > = [];

    if (idsInOrder.length > 0) {
      const [usersRows, tracks] = await Promise.all([
        db.user.findMany({
          where: { id: { in: idsInOrder } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            image: true,
            employeeType: true,
          },
        }),
        db.chatTrack.findMany({
          where: {
            section: "internal",
            OR: [
              { senderId: userIdNum, receiverId: { in: idsInOrder } },
              { receiverId: userIdNum, senderId: { in: idsInOrder } },
            ],
          },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

      const userById = new Map(usersRows.map((u) => [u.id, u]));
      const latestChatTrackMap = new Map<number, (typeof tracks)[0]>();
      for (const track of tracks) {
        const otherId =
          track.senderId === userIdNum ? track.receiverId : track.senderId;
        if (otherId && !latestChatTrackMap.has(otherId)) {
          latestChatTrackMap.set(otherId, track);
        }
      }

      paginatedUsers = idsInOrder
        .map((id) => {
          const user = userById.get(id);
          if (!user) return null;
          return { ...user, chatTrack: latestChatTrackMap.get(id) ?? null };
        })
        .filter(
          (u): u is NonNullable<(typeof paginatedUsers)[number]> => u !== null,
        );
    }

    const hasNextPage = pageNum * limitNum < totalRecords;
    const hasPrevPage = pageNum > 1;
    const totalPages = Math.ceil(totalRecords / limitNum);

    return NextResponse.json(
      {
        success: true,
        data: paginatedUsers,
        message: "Messages fetched successfully",
        meta: {
          totalRecords,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const errors = errorHandler(error);
    const message = errors?.message || "Internal Server Error";
    const status = errors?.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
};

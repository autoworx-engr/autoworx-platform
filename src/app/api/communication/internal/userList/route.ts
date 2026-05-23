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
    const skip = (pageNum - 1) * limitNum;

    // Search predicate as a Prisma `where` fragment — same one drives the
    // `findMany` and the `count`, so `meta.totalRecords` and `data` can never
    // disagree under search.
    const searchTerm = search.trim();
    const searchWords = searchTerm ? searchTerm.split(/\s+/) : [];
    const buildSearchWhere = (): Prisma.UserWhereInput => {
      if (!searchTerm) return {};
      const conditions: Prisma.UserWhereInput[] = [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
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
      companyId: principal.companyId,
      NOT: { id: userIdNum },
      ...buildSearchWhere(),
    };

    // Strategy: only load the *bounded* "users I've chatted with" set
    // upfront — that set is capped by the viewer's actual conversation
    // partners, not the whole company. Never-chatted users (the tail) are
    // paginated at the DB level via findMany skip/take, so we never
    // materialize all company users in memory.
    const userSelect = {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      image: true,
      employeeType: true,
    } as const;

    const [tracks, totalRecords] = await Promise.all([
      db.chatTrack.findMany({
        where: {
          section: "internal",
          OR: [{ senderId: userIdNum }, { receiverId: userIdNum }],
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.user.count({ where }),
    ]);

    // counterpart -> latest chatTrack (tracks already desc, first one wins).
    const latestChatTrackMap = new Map<number, (typeof tracks)[0]>();
    for (const track of tracks) {
      const otherId =
        track.senderId === userIdNum ? track.receiverId : track.senderId;
      if (otherId && !latestChatTrackMap.has(otherId)) {
        latestChatTrackMap.set(otherId, track);
      }
    }
    const chattedCounterpartIds = [...latestChatTrackMap.keys()];

    // Fetch only the chatted counterparts that ALSO match the current `where`
    // (search filter, company scope, NOT self). Keeps them in the
    // updatedAt-desc order established above.
    const chattedUsersRaw =
      chattedCounterpartIds.length > 0
        ? await db.user.findMany({
            where: { ...where, id: { in: chattedCounterpartIds } },
            select: userSelect,
          })
        : [];
    const chattedUserById = new Map(chattedUsersRaw.map((u) => [u.id, u]));
    const chattedSorted = chattedCounterpartIds
      .map((id) => chattedUserById.get(id))
      .filter((u): u is NonNullable<typeof u> => Boolean(u));

    // Carve the page out of (chatted ++ never-chatted).
    const chattedTotal = chattedSorted.length;
    const chattedSliceStart = Math.min(skip, chattedTotal);
    const chattedSliceEnd = Math.min(skip + limitNum, chattedTotal);
    const pageUsers = chattedSorted.slice(chattedSliceStart, chattedSliceEnd);

    const remaining = limitNum - pageUsers.length;
    if (remaining > 0) {
      const neverChattedSkip = Math.max(0, skip - chattedTotal);
      const neverChattedUsers = await db.user.findMany({
        where: {
          ...where,
          ...(chattedCounterpartIds.length > 0
            ? {
                NOT: [{ id: userIdNum }, { id: { in: chattedCounterpartIds } }],
              }
            : {}),
        },
        orderBy: { id: "asc" },
        skip: neverChattedSkip,
        take: remaining,
        select: userSelect,
      });
      pageUsers.push(...neverChattedUsers);
    }

    const paginatedUsers = pageUsers.map((u) => ({
      ...u,
      chatTrack: latestChatTrackMap.get(u.id) ?? null,
    }));

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

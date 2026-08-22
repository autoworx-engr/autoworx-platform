import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_SORT_FIELDS = new Set(["name", "createdAt", "updatedAt"]);
const ALLOWED_SORT_ORDERS = new Set(["asc", "desc"]);

type GroupWithUsers = Prisma.GroupGetPayload<{ include: { users: true } }>;

/**
 * Attach each group's newest message so the list can preview it the way
 * direct-message rows do. Shaped as `chatTrack` — the field the app already
 * reads for one-to-one conversations — so both row types render the same way.
 *
 * Two batched queries: `distinct` on `groupId` takes one row per group, then
 * the senders are resolved in a single lookup.
 */
async function attachLastMessages(
  currentUserId: number,
  groups: GroupWithUsers[],
) {
  if (groups.length === 0) return groups;
  const groupIds = groups.map((g) => g.id);

  const messages = await db.message.findMany({
    where: { groupId: { in: groupIds } },
    distinct: ["groupId"],
    orderBy: [{ groupId: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      message: true,
      from: true,
      groupId: true,
      createdAt: true,
    },
  });

  const senderIds = [
    ...new Set(
      messages.map((m) => m.from).filter((id) => id !== currentUserId),
    ),
  ];
  const senders = senderIds.length
    ? await db.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, firstName: true },
      })
    : [];
  const nameById = new Map(senders.map((s) => [s.id, s.firstName]));

  const trackByGroup = new Map<number, Record<string, unknown>>();
  for (const m of messages) {
    if (m.groupId == null) continue;
    trackByGroup.set(m.groupId, {
      id: m.id,
      lastMessage: m.message,
      senderId: m.from,
      // `receiverId` is what the app compares against the row id to decide
      // whether to prefix with "You" — set it for the viewer's own messages.
      receiverId: m.from === currentUserId ? m.groupId : null,
      senderName:
        m.from === currentUserId ? null : (nameById.get(m.from) ?? null),
      isRead: true,
      createdAt: m.createdAt,
    });
  }

  return groups.map((g) => ({
    ...g,
    chatTrack: trackByGroup.get(g.id) ?? null,
  }));
}

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

    const data = await attachLastMessages(principal.userId, groups);

    return NextResponse.json(
      {
        success: true,
        data,
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

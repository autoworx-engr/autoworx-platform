import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { getPusherInstance } from "@/lib/pusher/server";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { deleteGroupIfEmpty } from "@/actions/communication/internal/_utils/deleteGroupIfEmpty";
import {
  findDuplicateGroupName,
  normalizeGroupName,
} from "@/actions/communication/internal/_utils/groupName";

const pusher = getPusherInstance();

const findUsers = async (
  users: { id: number; action?: string }[],
  companyId: number,
) => {
  const ids = users.map((u) => {
    if (!u.id) throw new Error("User ID is required");
    return u.id;
  });

  const found = await db.user.findMany({
    where: { id: { in: ids }, companyId },
    select: { id: true },
  });

  if (found.length !== ids.length) {
    const foundSet = new Set(found.map((u) => u.id));
    const missing = ids.find((id) => !foundSet.has(id));
    throw new Error(`User with ID ${missing} not found in company`);
  }

  return found;
};

/**
 * @swagger
 * /api/communication/internal/group:
 *   post:
 *     summary: Create a new group
 *     tags: [Internal]
 *     description: Creates a new group with the given name and connects it to the specified users.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the group
 *               users:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: The ID of the user
 *                 description: Array of user objects with IDs
 *               companyId:
 *                 type: integer
 *                 description: The ID of the company
 *     responses:
 *       200:
 *         description: Group created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
export const POST = async (req: NextRequest) => {
  try {
    const principal = await getAuthPrincipal(req);
    if (!principal) throw new AppError(401, "Unauthorized");

    const { name, users } = await req.json();
    const companyId = principal.companyId;

    const normalizedName = normalizeGroupName(name ?? "");
    if (!normalizedName) {
      throw new AppError(400, "Group name is required");
    }

    const duplicate = await findDuplicateGroupName(companyId, normalizedName);
    if (duplicate) {
      throw new AppError(409, "Group name already exists.");
    }

    const findUser = await findUsers(users, companyId);
    if (findUser && findUser?.length !== users?.length) {
      throw new AppError(400, "One or more users not found");
    }

    const groupData = await db.group.create({
      data: {
        name: normalizedName,
        companyId,
        users: {
          connect: users,
        },
      },
      include: {
        users: true,
      },
    });

    if (groupData) {
      pusher.trigger("create-group", "create", {
        groupId: groupData.id,
        usersIds: users,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: groupData,
        message: "Group created successfully",
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

/**
 * @swagger
 * /api/communication/internal/group:
 *   get:
 *     summary: Get groups for a user
 *     tags: [Internal]
 *     description: Retrieves paginated list of groups that the specified user is part of.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of groups per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by group name
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Groups fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       users:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                 message:
 *                   type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totalRecords:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
export const GET = async (req: NextRequest) => {
  try {
    const principal = await getAuthPrincipal(req);
    if (!principal) throw new AppError(401, "Unauthorized");

    const searchParams = req.nextUrl.searchParams;

    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

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

    const groups = await db.group.findMany({
      where,
      include: {
        users: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    const totalGroups = await db.group.count({
      where,
    });

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
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
};

/**
 * @swagger
 * /api/communication/internal/group:
 *   put:
 *     summary: Update a group
 *     tags: [Internal]
 *     description: Updates the name and users of an existing group.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupId:
 *                 type: integer
 *                 description: The ID of the group to update
 *               name:
 *                 type: string
 *                 description: The new name of the group
 *               users:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: The ID of the user
 *                     action:
 *                       type: string
 *                       enum: [add, remove]
 *                       description: The action to perform (add or remove). Defaults to add if not specified.
 *                 description: Array of user objects with IDs and actions
 *     responses:
 *       200:
 *         description: Group updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       404:
 *         description: Group not found
 *       500:
 *         description: Internal server error
 */
export const PUT = async (req: NextRequest) => {
  try {
    const principal = await getAuthPrincipal(req);
    if (!principal) throw new AppError(401, "Unauthorized");

    const { groupId, name, users } = await req.json();

    if (!groupId) {
      throw new AppError(400, "Group ID is required");
    }
    // Legacy groups can have companyId = null; membership check enforces tenant isolation.
    const findGroup = await db.group.findFirst({
      where: {
        id: groupId,
        OR: [{ companyId: principal.companyId }, { companyId: null }],
        users: { some: { id: principal.userId } },
      },
      select: { id: true, name: true },
    });

    if (!findGroup) {
      throw new AppError(404, "Group not found");
    }

    // Duplicate-name check (skipped when name unchanged). Scoped to the
    // caller's company — legacy null-companyId groups aren't part of the
    // tenant namespace.
    let normalizedNewName: string | undefined;
    if (typeof name === "string") {
      normalizedNewName = normalizeGroupName(name);
      if (!normalizedNewName) {
        throw new AppError(400, "Group name is required");
      }
      const currentNormalized = normalizeGroupName(findGroup.name);
      if (normalizedNewName.toLowerCase() !== currentNormalized.toLowerCase()) {
        const duplicate = await findDuplicateGroupName(
          principal.companyId,
          normalizedNewName,
          groupId,
        );
        if (duplicate) {
          throw new AppError(409, "Group name already exists.");
        }
      }
    }

    const connectUsers =
      users
        ?.filter(
          (u: { id: number; action?: string }) =>
            u.action === "add" || !u.action,
        )
        .map((u: { id: number }) => ({ id: u.id })) || [];
    const disconnectUsers =
      users
        ?.filter((u: { id: number; action?: string }) => u.action === "remove")
        .map((u: { id: number }) => ({ id: u.id })) || [];

    if (connectUsers.length > 0) {
      const findUser = await findUsers(connectUsers, principal.companyId);
      if (findUser && findUser?.length !== connectUsers?.length) {
        throw new AppError(400, "One or more users to add not found");
      }
    }

    const { updatedGroup, groupDeleted } = await db.$transaction(async (tx) => {
      const updated = await tx.group.update({
        where: { id: groupId },
        data: {
          name: normalizedNewName,
          users: {
            connect: connectUsers.length > 0 ? connectUsers : undefined,
            disconnect:
              disconnectUsers.length > 0 ? disconnectUsers : undefined,
          },
        },
        include: { users: true },
      });
      const deleted =
        disconnectUsers.length > 0
          ? await deleteGroupIfEmpty(groupId, tx)
          : false;
      return { updatedGroup: updated, groupDeleted: deleted };
    });

    if (connectUsers.length > 0) {
      pusher.trigger("add-member-in-group", "add-member", {
        groupId: updatedGroup.id,
        userIds: connectUsers,
      });
    }
    if (disconnectUsers.length > 0) {
      // Same channel both ways — when groupDeleted is true, the sidebar's
      // `getGroupById` call will return null and the group is removed from
      // every viewer's list.
      pusher.trigger("delete-group", "delete", {
        groupId: updatedGroup.id,
        userIds: disconnectUsers,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: groupDeleted ? null : updatedGroup,
        message: groupDeleted
          ? "Group deleted (last member left)"
          : "Group updated successfully",
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

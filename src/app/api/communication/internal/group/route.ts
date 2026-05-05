import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";

const pusher = getPusherInstance();

const findUsers = (users: { id: number; action?: string }[]) => {
  return Promise.all(
    users.map(async (user: { id: number; action?: string }) => {
      if (!user.id) {
        throw new Error("User ID is required");
      }
      const findUser = await db.user.findUnique({
        where: {
          id: user.id,
        },
      });
      if (!findUser) {
        throw new Error(`User with ID ${user.id} not found`);
      }
      return findUser;
    }),
  );
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
    const { name, users, companyId } = await req.json();

    if (!companyId) {
      throw new AppError(400, "Company ID is required");
    }

    const findUser = await findUsers(users);

    if (findUser && findUser?.length !== users?.length) {
      throw new AppError(400, "One or more users not found");
    }
    // Your logic for handling the POST request goes here.
    const groupData = await db.group.create({
      data: {
        name: name,
        companyId: companyId,
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
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get("userId") ?? "";

    const findUser = await db.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!findUser) {
      throw new AppError(404, "User not found");
    }

    const pageNum = parseInt(searchParams.get("page") || "1");
    const limitNum = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const where: any = {
      users: { some: { id: parseInt(userId) } },
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

    console.log(
      "[GET /api/internal/group] group list order:",
      groups.map((g) => ({ id: g.id, name: g.name, updatedAt: g.updatedAt })),
    );

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
    const { groupId, name, users } = await req.json();

    if (!groupId) {
      throw new AppError(400, "Group ID is required");
    }
    const findGroup = await db.group.findUnique({
      where: { id: groupId },
    });

    if (!findGroup) {
      throw new AppError(404, "Group not found");
    }

    const connectUsers =
      users
        ?.filter((u: any) => u.action === "add" || !u.action)
        .map((u: any) => ({ id: u.id })) || [];
    const disconnectUsers =
      users
        ?.filter((u: any) => u.action === "remove")
        .map((u: any) => ({ id: u.id })) || [];

    if (connectUsers.length > 0) {
      const findUser = await findUsers(connectUsers);
      if (findUser && findUser?.length !== connectUsers?.length) {
        throw new AppError(400, "One or more users to add not found");
      }
    }

    const updatedGroup = await db.group.update({
      where: { id: groupId },
      data: {
        name: name,
        users: {
          connect: connectUsers.length > 0 ? connectUsers : undefined,
          disconnect: disconnectUsers.length > 0 ? disconnectUsers : undefined,
        },
      },
      include: {
        users: true,
      },
    });

    if (updatedGroup) {
      if (connectUsers.length > 0) {
        pusher.trigger("add-member-in-group", "add-member", {
          groupId: updatedGroup.id,
          userIds: connectUsers,
        });
      }
      if (disconnectUsers.length > 0) {
        pusher.trigger("remove-member-from-group", "remove-member", {
          groupId: updatedGroup.id,
          userIds: disconnectUsers,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedGroup,
        message: "Group updated successfully",
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

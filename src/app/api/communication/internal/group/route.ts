import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";

const pusher = getPusherInstance();

/**
 * @swagger
 * /api/communication/internal/group:
 *   post:
 *     summary: Create a new group
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
    const { name, users } = await req.json();

    const findUser = await Promise.all(
      users.map(async (user: { id: number }) => {
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

    if (findUser && findUser?.length !== users?.length) {
      throw new AppError(400, "One or more users not found");
    }
    // Your logic for handling the POST request goes here.
    const groupData = await db.group.create({
      data: {
        name: name,
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

    const groups = await db.group.findMany({
      where: { users: { some: { id: parseInt(userId) } } },
      include: {
        users: true,
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    const totalGroups = await db.group.count({
      where: { users: { some: { id: parseInt(userId) } } },
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

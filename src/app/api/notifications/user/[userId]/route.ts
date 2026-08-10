import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/notifications/user/{userId}:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get notifications by userId
 *     description: Fetch all notifications for a specific user with pagination.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: Company ID
 *         schema:
 *           type: integer
 *           example: 3
 *       - in: query
 *         name: page
 *         required: false
 *         description: Page number
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of notifications per page
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 40
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 4
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: New Task Assigned
 *                       description:
 *                         type: string
 *                         example: You have been assigned a new task
 *                       type:
 *                         type: string
 *                         example: task
 *                       avatarUrl:
 *                         type: string
 *                         example: /images/user.png
 *                       redirectUrl:
 *                         type: string
 *                         example: /dashboard/tasks
 *                       isUnRead:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid userId
 *       500:
 *         description: Failed to fetch notifications
 */

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ userId: string }> },
) {
  const params = await props.params;
  try {
    const userId = Number(params.userId);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid userId",
        },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    const skip = (page - 1) * limit;

    const [notifications, total, unreadNotificationCount] = await Promise.all([
      db.notification.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      db.notification.count({
        where: {
          userId,
        },
      }),
      db.notification.count({
        where: {
          userId,
          isUnRead: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: {
        unreadNotificationCount,
        notifications,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch notifications",
      },
      { status: 500 },
    );
  }
}

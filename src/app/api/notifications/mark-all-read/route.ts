import { markAsAllRead } from "@/actions/notification/markAsRead";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Mark notifications as read
 *     description: Mark all notifications or selected notifications as read for a user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 5
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1,2,3]
 *     responses:
 *       200:
 *         description: Notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notifications marked as read
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to update notifications
 */

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    const { userId, notificationIds } = body;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "userId is required",
        },
        { status: 400 },
      );
    }

    const result = await markAsAllRead(userId, notificationIds);

    if (result?.type === "error") {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update notifications",
      },
      { status: 500 },
    );
  }
}

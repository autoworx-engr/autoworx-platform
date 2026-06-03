import { markAsReadById } from "@/actions/notification/markAsRead";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/notifications/mark-read/{id}:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Mark a notification as read
 *     description: Mark a specific notification as read by notification ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Notification ID
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid notification ID
 *       500:
 *         description: Failed to update notification
 */

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const notificationId = Number(params.id);

    if (!notificationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid notificationId",
        },
        { status: 400 },
      );
    }

    const result = await markAsReadById(notificationId);

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
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update notification",
      },
      { status: 500 },
    );
  }
}

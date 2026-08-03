import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientMessages } from "@/actions/message/getClientMessages";
import { fetchRecentMessages } from "@/actions/dashboard/technician/recentMessages";

/**
 * @swagger
 * /api/dashboard/recent-messages:
 *   get:
 *     summary: Get recent dashboard messages (client + internal)
 *     tags: [dashboard Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 12
 *         description: Logged-in user ID
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: john
 *         description: Search clients by first name or last name (only for Sales)
 *     responses:
 *       200:
 *         description: Recent messages fetched successfully
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
 *                   example: Recent messages retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     clientMessages:
 *                       type: object
 *                       nullable: true
 *                     internalMessages:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: User ID is required or invalid user
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const userIdParam = searchParams.get("userId");
    const search = searchParams.get("search")?.trim() || "";

    if (!userIdParam) {
      return NextResponse.json(
        { success: false, message: "userId query is required" },
        { status: 400 },
      );
    }

    const userId = Number(userIdParam);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid userId" },
        { status: 400 },
      );
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "The user does not exist!" },
        { status: 400 },
      );
    }

    // 🔹 Client messages (only for Sales)
    const clientData =
      user.employeeType === "Sales"
        ? await getClientMessages(1, search, user)
        : null;

    // 🔹 Internal recent messages (for all roles)
    const defaultTake = 100;
    const internalMessages = await fetchRecentMessages(defaultTake, user);

    return NextResponse.json({
      success: true,
      message: "Recent messages retrieved successfully",
      data: {
        clientMessages: clientData,
        internalMessages,
      },
    });
  } catch (error) {
    console.error("Error fetching recent dashboard messages:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}

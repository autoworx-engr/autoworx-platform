import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/internal/group/{groupId}:
 *   get:
 *     summary: Retrieve group details by ID
 *     tags: [Internal]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the group to retrieve
 *     responses:
 *       200:
 *         description: Group details retrieved successfully
 *       404:
 *         description: Group not found
 */

export const GET = async (
  req: Request,
  { params }: { params: { groupId: string } },
) => {
  try {
    const groupId = params?.groupId;

    const findGroup = await db.group.findUnique({
      where: { id: parseInt(groupId, 10) },
      include: {
        users: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: findGroup,
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

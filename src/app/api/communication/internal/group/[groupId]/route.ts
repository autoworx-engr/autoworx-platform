import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 */
export const GET = async (
  req: NextRequest,
  props: { params: Promise<{ groupId: string }> },
) => {
  try {
    const principal = await getAuthPrincipal(req);
    if (!principal) throw new AppError(401, "Unauthorized");

    const { groupId } = await props.params;

    // Legacy groups can have companyId = null; membership check enforces tenant isolation.
    // Members are paginated via /group/{groupId}/members — here we return only the
    // member count so the client can render "Members (N)" without loading everyone.
    const findGroup = await db.group.findFirst({
      where: {
        id: parseInt(groupId, 10),
        OR: [{ companyId: principal.companyId }, { companyId: null }],
        users: { some: { id: principal.userId } },
      },
      include: { _count: { select: { users: true } } },
    });

    if (!findGroup) {
      throw new AppError(404, "Group not found");
    }

    const { _count, ...group } = findGroup;

    return NextResponse.json(
      {
        success: true,
        data: { ...group, membersCount: _count.users },
        message: "Group fetched successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    const errors = errorHandler(error);
    const message = errors?.message || "Internal Server Error";
    const status = errors?.statusCode || 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
};

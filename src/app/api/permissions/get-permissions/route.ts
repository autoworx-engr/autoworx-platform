import { NextRequest, NextResponse } from "next/server";
import getPermissions from "@/lib/getPermissions";

/**
 * @swagger
 * /api/permissions/get-permissions:
 *   get:
 *     summary: Get permissions for current logged-in user
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Company ID for which permissions are being requested
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: User ID for which permissions are being requested
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
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
 *                   example: Permissions retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       example: Manager
 *                     isSuperAdmin:
 *                       type: boolean
 *                       example: false
 *                     companyPermissions:
 *                       type: object
 *                       nullable: true
 *                     userPermissions:
 *                       type: object
 *                       nullable: true
 *       400:
 *         description: Company ID is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = Number(searchParams.get("companyId"));
    const userId = Number(searchParams.get("userId"));

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Company ID is required" },
        { status: 400 },
      );
    }
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 },
      );
    }

    const permissions = await getPermissions(companyId, userId);

    if (!permissions) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Permissions retrieved successfully",
      data: permissions,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

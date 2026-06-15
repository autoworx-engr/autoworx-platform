import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/collaboration/company/{companyId}/enable:
 *   patch:
 *     summary: Update collaboration status for the caller's own company
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isCollaborators: { type: boolean }
 *     responses:
 *       200: { description: Collaboration status updated }
 *       400: { description: Invalid parameters }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — cannot modify another company }
 *       500: { description: Server error }
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ companyId: string }> },
) {
  try {
    const params = await props.params;
    const companyId = Number(params.companyId);

    if (isNaN(companyId)) {
      throw new AppError(400, "Invalid company ID");
    }

    const callerCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (!callerCompanyId) {
      throw new AppError(401, "Unauthorized");
    }

    if (callerCompanyId !== companyId) {
      throw new AppError(
        403,
        "You can only update your own company's collaboration status.",
      );
    }

    const body = await req.json();
    const { isCollaborators } = body;

    if (typeof isCollaborators !== "boolean") {
      throw new AppError(400, "isCollaborators must be boolean");
    }

    const company = await db.company.update({
      where: { id: companyId },
      data: { isCollaborators },
      select: { id: true, isCollaborators: true },
    });

    revalidatePath("/dashboard/communication/collaboration");

    return NextResponse.json(
      { message: "Collaboration status updated", data: company },
      { status: 200 },
    );
  } catch (error) {
    const errors = errorHandler(error);
    return NextResponse.json(
      { success: false, message: errors?.message || "Internal server error" },
      { status: errors?.statusCode || 500 },
    );
  }
}

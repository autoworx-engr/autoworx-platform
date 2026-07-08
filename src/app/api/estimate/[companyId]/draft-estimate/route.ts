import { createLeadDraftEstimate } from "@/actions/pipelines/createLeadDraftEstimate";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { customAlphabet } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/estimate/{companyId}/draft-estimate:
 *   post:
 *     summary: Create a lead draft estimate
 *     tags: [Estimate]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leadId
 *               - clientId
 *             properties:
 *               leadId:
 *                 type: integer
 *               clientId:
 *                 type: integer
 *               vehicleId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Draft estimate successfully created
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to create draft estimate
 */
export const POST = async (req: NextRequest) => {
  try {
    const { userId, companyId } = (await getAuthPrincipal(req)) ?? {};

    if (!userId || !companyId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const body = await req.json();
    const { leadId, clientId, vehicleId } = body as {
      leadId?: number;
      clientId: number;
      vehicleId?: number;
    };

    if (!clientId) {
      throw new AppError(400, "Missing required fields: clientId");
    }

    const draftEstimateId = customAlphabet("1234567890", 10)();
    const res = await createLeadDraftEstimate({
      id: draftEstimateId,
      leadId,
      clientId,
      userId,
      companyId,
      vehicleId,
      type: "Estimate",
    });
    if (res.type === "success") {
      return NextResponse.json(
        { success: true, data: res.data },
        { status: 201 },
      );
    } else if (res.type === "error") {
      return NextResponse.json(
        { success: false, data: res.data, message: res.message },
        { status: 409 },
      );
    } else {
      throw new AppError(500, res.message || "Failed to create draft estimate");
    }
  } catch (error) {
    const formattedError = errorHandler(error);
    return NextResponse.json(
      {
        success: false,
        message: formattedError.message,
        errorDetails: formattedError,
      },
      { status: formattedError.statusCode },
    );
  }
};

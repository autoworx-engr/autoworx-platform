import { createDraftEstimate } from "@/actions/estimate/invoice/createDraft";
import { createLeadDraftEstimate } from "@/actions/pipelines/createLeadDraftEstimate";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { ServerAction } from "@/types/action";
import { customAlphabet } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/estimate/{companyId}/draft-estimate:
 *   post:
 *     summary: Create a draft estimate
 *     description: >
 *       Creates a draft estimate for a client. By default (isEstimate=false) this creates a
 *       lead-based draft estimate via the pipeline flow, guarding against duplicates per lead
 *       (see createLeadDraftEstimate). When isEstimate=true, it instead creates a plain draft
 *       estimate (optionally pre-filled with requestedServices) via createDraftEstimate.
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
 *               - clientId
 *             properties:
 *               leadId:
 *                 type: integer
 *                 description: Required when isEstimate is false
 *               clientId:
 *                 type: integer
 *               vehicleId:
 *                 type: integer
 *               isEstimate:
 *                 type: boolean
 *                 default: false
 *                 description: >
 *                   false (default): create via createLeadDraftEstimate (lead-based, duplicate-guarded).
 *                   true: create via createDraftEstimate (plain draft estimate, no lead required).
 *               requestedServices:
 *                 type: array
 *                 description: Only used when isEstimate is true.
 *                 items:
 *                   type: object
 *                   properties:
 *                     shopServiceId:
 *                       type: string
 *                     vehicleType:
 *                       type: string
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
    const {
      leadId,
      clientId,
      vehicleId,
      isEstimate = false,
      requestedServices,
    } = body as {
      leadId?: number;
      clientId: number;
      vehicleId?: number;
      isEstimate?: boolean;
      requestedServices?: { shopServiceId: string; vehicleType: string }[];
    };

    if (!clientId) {
      throw new AppError(400, "Missing required fields: clientId");
    }

    const draftEstimateId = customAlphabet("1234567890", 10)();
    const res = isEstimate
      ? ((await createDraftEstimate({
          id: draftEstimateId,
          clientId,
          vehicleId,
          requestedServices: requestedServices as any,
          cId: companyId,
          uId: userId,
        })) as ServerAction)
      : await createLeadDraftEstimate({
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

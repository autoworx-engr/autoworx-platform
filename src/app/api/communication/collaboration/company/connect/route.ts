import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { sendUserNotifications } from "@/actions/notification/sendUserNotification";
import { connectWithCompany } from "@/actions/settings/myNetwork";

/**
 * @swagger
 * /api/communication/collaboration/company/connect:
 *   post:
 *     summary: Connect with a company for collaboration
 *     tags: [Collaboration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetCompanyId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Successfully connected with the company
 *       400:
 *         description: Target Company ID is required
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Connection already exists
 *       500:
 *         description: Internal Server Error
 */
export const POST = async (request: NextRequest) => {
  try {
    const reqBody = await request.json();
    const { targetCompanyId } = reqBody;

    if (!targetCompanyId) {
      throw new AppError(400, "Target Company ID is required.");
    }

    const authHeader = request.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer")
      ? authHeader.split(" ")[1]
      : authHeader;

    const verifyToken = await jwtVerifyToken(accessToken);

    if (!verifyToken?.payload) {
      throw new AppError(401, "Unauthorized");
    }

    const userCompanyId = verifyToken?.payload?.companyId as number;
    const userId = verifyToken?.payload?.id as number;

    if (!userCompanyId || !userId) {
      throw new AppError(401, "Invalid token payload");
    }

    await connectWithCompany({ targetCompanyId, userCompanyId });

    return NextResponse.json(
      {
        success: true,
        message: "Successfully connected with the company.",
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

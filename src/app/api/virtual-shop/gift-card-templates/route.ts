import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  imageUrl: z.string().url("Must be a valid URL"),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
}).refine(data => !(data.isActive === false && data.isDefault === true), {
  message: "A template cannot be set as default if it is inactive",
  path: ["isDefault"],
});

/**
 * @swagger
 * /api/virtual-shop/gift-card-templates:
 *   get:
 *     summary: List all gift card templates
 *     description: Fetch all gift card UI templates for the authenticated company.
 *     tags:
 *       - Virtual Shop Gift
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved templates.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer")
      ? authHeader.split(" ")[1]
      : authHeader;

    const verifyToken = await jwtVerifyToken(accessToken);

    if (!verifyToken?.payload) {
      throw new AppError(401, "Unauthorized");
    }

    const companyId = verifyToken?.payload?.companyId as number;

    if (!companyId) {
      throw new AppError(403, "Company ID not found in session");
    }

    const templates = await db.giftCardTemplate.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, data: templates },
      { status: 200 },
    );
  } catch (error: any) {
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
}

/**
 * @swagger
 * /api/virtual-shop/gift-card-templates:
 *   post:
 *     summary: Create a gift card template
 *     description: Create a new visual template for gift cards.
 *     tags:
 *       - Virtual Shop Gift
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - imageUrl
 *             properties:
 *               name:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               isActive:
 *                 type: boolean
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Successfully created template.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer")
      ? authHeader.split(" ")[1]
      : authHeader;

    const verifyToken = await jwtVerifyToken(accessToken);

    if (!verifyToken?.payload) {
      throw new AppError(401, "Unauthorized");
    }

    const companyId = verifyToken?.payload?.companyId as number;

    if (!companyId) {
      throw new AppError(403, "Company ID not found in session");
    }

    const body = await req.json();
    const parsedBody = createTemplateSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new AppError(
        400,
        `Validation Error: ${parsedBody.error.errors.map(e => e.message).join(", ")}`
      );
    }

    const { name, imageUrl, isActive, isDefault } = parsedBody.data;

    const newTemplate = await db.$transaction(async (tx) => {
      // If we are setting this newly created template as default, turn off default for all others
      if (isDefault) {
        await tx.giftCardTemplate.updateMany({
          where: { companyId },
          data: { isDefault: false },
        });
      }

      return await tx.giftCardTemplate.create({
        data: {
          companyId,
          name,
          imageUrl,
          isActive,
          isDefault,
        },
      });
    });

    return NextResponse.json(
      { success: true, message: "Template created successfully", data: newTemplate },
      { status: 201 },
    );
  } catch (error: any) {
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
}

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerifyToken } from "@/lib/jwtVerify";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { z } from "zod";

const updateTemplateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255)
    .optional(),
  imageUrl: z.string().url("Must be a valid URL").optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * @swagger
 * /api/virtual-shop/gift-card-templates/{id}:
 *   patch:
 *     summary: Update a gift card template
 *     description: Update specific fields of an existing visual template.
 *     tags:
 *       - Virtual Shop Gift
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *       200:
 *         description: Successfully updated template.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
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

    const templateId = parseInt(params.id, 10);
    if (isNaN(templateId)) {
      throw new AppError(400, "Invalid template ID");
    }

    const existingTemplate = await db.giftCardTemplate.findUnique({
      where: { id: templateId },
      include: { shop: { select: { companyId: true } } },
    });

    if (!existingTemplate || existingTemplate.shop.companyId !== companyId) {
      throw new AppError(404, "Template not found or unauthorized");
    }

    const body = await req.json();
    const parsedBody = updateTemplateSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new AppError(
        400,
        `Validation Error: ${parsedBody.error.errors.map((e) => e.message).join(", ")}`,
      );
    }

    const { name, imageUrl, isActive, isDefault } = parsedBody.data;

    if (
      name !== undefined &&
      name.toLowerCase() !== existingTemplate.name.toLowerCase()
    ) {
      const duplicateTemplate = await db.giftCardTemplate.findFirst({
        where: {
          shopId: existingTemplate.shopId,
          name: { equals: name, mode: "insensitive" },
          id: { not: templateId },
        },
      });

      if (duplicateTemplate) {
        throw new AppError(
          409,
          "A template with this name already exists for this shop",
        );
      }
    }

    const finalIsActive = isActive ?? existingTemplate.isActive;
    const finalIsDefault = isDefault ?? existingTemplate.isDefault;

    // Cross validation: check if trying to make/keep it default while setting it inactive
    if (finalIsDefault === true && finalIsActive === false) {
      throw new AppError(
        400,
        "A template cannot be set as default if it is inactive",
      );
    }

    const updatedTemplate = await db.$transaction(async (tx) => {
      // If we are explicitly enabling isDefault=true, untoggle all other templates for this shop
      if (isDefault === true) {
        await tx.giftCardTemplate.updateMany({
          where: {
            shopId: existingTemplate.shopId,
            id: { not: templateId },
          },
          data: { isDefault: false },
        });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isDefault !== undefined) updateData.isDefault = isDefault;

      return await tx.giftCardTemplate.update({
        where: { id: templateId },
        data: updateData,
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Template updated successfully",
        data: updatedTemplate,
      },
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
 * /api/virtual-shop/gift-card-templates/{id}:
 *   delete:
 *     summary: Delete a gift card template
 *     description: Remove a visual template permanently.
 *     tags:
 *       - Virtual Shop Gift
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully deleted template.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Template not found.
 *       500:
 *         description: Internal server error.
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
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

    const templateId = parseInt(params.id, 10);
    if (isNaN(templateId)) {
      throw new AppError(400, "Invalid template ID");
    }

    const existingTemplate = await db.giftCardTemplate.findUnique({
      where: { id: templateId },
      include: { shop: { select: { companyId: true } } },
    });

    if (!existingTemplate || existingTemplate.shop.companyId !== companyId) {
      throw new AppError(404, "Template not found or unauthorized");
    }

    await db.giftCardTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json(
      { success: true, message: "Template deleted successfully" },
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

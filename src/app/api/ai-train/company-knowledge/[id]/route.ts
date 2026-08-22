import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { validateCompanyId } from "../../utils";

/**
 * @swagger
 * /api/ai-train/company-knowledge/{id}:
 *   get:
 *     summary: Get company info by ID
 *     tags: [Company Knowledge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Company Info retrieved successfully
 *       400:
 *         description: Company ID is required
 *       404:
 *         description: Company info not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const validation = validateCompanyId(req);
    if (validation instanceof NextResponse) return validation;
    const { companyId } = validation;

    const companyInfo = await db.companyInfo.findFirst({
      where: {
        id: Number(params.id),
      },
      select: {
        companyId: true,
        shopName: true,
        about: true,
        address: true,
        phone: true,
        websiteUrl: true,
        hours: true,
        policies: true,
      },
    });

    if (!companyInfo) {
      return NextResponse.json(
        { success: false, message: "Company info not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      message: "Company Info retrieved successfully",
      data: companyInfo,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/ai-train/company-knowledge/{id}:
 *   patch:
 *     summary: Update company info by ID
 *     tags: [Company Knowledge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: companyId
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
 *               shopName:
 *                 type: string
 *                 example: TC Customs Atlanta
 *               about:
 *                 type: string
 *               address:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               websiteUrl:
 *                 type: string
 *               hours:
 *                 type: string
 *               policies:
 *                 type: string
 *               smsResponseDelayMin:
 *                 type: integer
 *               smsResponseDelayMax:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Company Info updated successfully
 *       400:
 *         description: Company ID is required
 *       404:
 *         description: Company info not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const body = await req.json();
    const validation = validateCompanyId(req);
    if (validation instanceof NextResponse) return validation;
    const { companyId } = validation;

    // Check if record exists and belongs to the company
    const existingInfo = await db.companyInfo.findFirst({
      where: {
        id: Number(params.id),
        companyId: companyId,
      },
    });

    if (!existingInfo) {
      return NextResponse.json(
        { success: false, message: "Company info not found" },
        { status: 404 },
      );
    }

    const updateData: any = {};

    if (body.shopName !== undefined) updateData.shopName = body.shopName;
    if (body.about !== undefined) updateData.about = body.about;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.websiteUrl !== undefined) updateData.websiteUrl = body.websiteUrl;
    if (body.hours !== undefined) updateData.hours = body.hours;
    if (body.policies !== undefined) updateData.policies = body.policies;

    const updatedInfo = await db.companyInfo.update({
      where: { id: Number(params.id) },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Company Info updated successfully",
      data: updatedInfo,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/ai-train/company-knowledge/{id}:
 *   delete:
 *     summary: Delete company info by ID
 *     tags: [Company Knowledge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Company Info deleted successfully
 *       400:
 *         description: Company ID is required
 *       404:
 *         description: Company info not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const validation = validateCompanyId(req);
    if (validation instanceof NextResponse) return validation;
    const { companyId } = validation;

    // Check if record exists and belongs to the company
    const existingInfo = await db.companyInfo.findFirst({
      where: {
        id: Number(params.id),
        companyId: companyId,
      },
    });

    if (!existingInfo) {
      return NextResponse.json(
        { success: false, message: "Company info not found" },
        { status: 404 },
      );
    }

    await db.companyInfo.delete({
      where: { id: Number(params.id) },
    });

    return NextResponse.json({
      success: true,
      message: "Company Info deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

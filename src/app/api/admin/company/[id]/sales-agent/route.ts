import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/admin/company/{id}/sales-agent:
 *   patch:
 *     summary: Update company sales agent permission
 *     description: Enable or disable sales agent feature for a company. If disabled, all clients under that company will also have their sales agent permission disabled automatically.
 *     tags:
 *       - Company
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Company ID
 *         schema:
 *           type: integer
 *           example: 4
 *     requestBody:
 *       required: true
 *       description: Sales agent permission toggle payload
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isSalesAgent
 *             properties:
 *               isSalesAgent:
 *                 type: boolean
 *                 description: Enable or disable company-level sales agent feature
 *                 example: true
 *     responses:
 *       200:
 *         description: Company sales agent permission updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Company sales agent permission updated successfully
 *       400:
 *         description: Invalid company ID or request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid company id
 *       404:
 *         description: Company not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Company not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 *                 error:
 *                   type: object
 *                   nullable: true
 */

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const companyId = Number(params.id);
    const { isSalesAgent } = await req.json();

    const company = await db.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 },
      );
    }

    // If turning OFF → disable all clients
    if (isSalesAgent === false) {
      await db.$transaction([
        db.company.update({
          where: { id: companyId },
          data: { isSalesAgent: false },
        }),
        db.client.updateMany({
          where: { companyId },
          data: { isSalesAgent: false },
        }),
      ]);
    } else {
      await db.company.update({
        where: { id: companyId },
        data: { isSalesAgent: true },
      });
    }

    return NextResponse.json({
      message: "Company sales agent permission updated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error", error },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/admin/company/{id}:
 *   get:
 *     summary: Get single company information
 *     description: Fetch detailed information of a company by its ID
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
 *     responses:
 *       200:
 *         description: Company fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 4
 *                 name:
 *                   type: string
 *                   example: Autoworx Inc
 *                 email:
 *                   type: string
 *                   nullable: true
 *                   example: support@autoworx.com
 *                 phone:
 *                   type: string
 *                   nullable: true
 *                   example: "+1234567890"
 *                 isSalesAgent:
 *                   type: boolean
 *                   example: true
 *                 businessType:
 *                   type: string
 *                   nullable: true
 *                   example: Automotive Repair
 *                 industry:
 *                   type: string
 *                   nullable: true
 *                   example: Auto Service
 *                 website:
 *                   type: string
 *                   nullable: true
 *                   example: https://autoworx.com
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-02-01T10:00:00.000Z
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-02-10T12:00:00.000Z
 *       400:
 *         description: Invalid company id
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
 */

// GET single company information
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const companyId = Number(params.id);

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { message: "Invalid company id" },
        { status: 400 },
      );
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isSalesAgent: true,
        businessType: true,
        industry: true,
        website: true,
        isCollaborators: true,
        createdAt: true,
        updatedAt: true,
        terms: true,
        policy: true,
        address: true,
        city: true,
        state: true,
        zip: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(company, { status: 200 });
  } catch (error) {
    console.error("GET COMPANY ERROR:", error);

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

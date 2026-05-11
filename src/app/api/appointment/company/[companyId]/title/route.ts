import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/appointment/company/{companyId}/title:
 *   get:
 *     summary: List all appointment titles for a company
 *     tags: [Appointment]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Appointment titles list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer, example: 1 }
 *                       name: { type: string, example: Oil Change }
 *                       companyId: { type: integer, example: 10 }
 *       400:
 *         description: Invalid companyId
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Invalid companyId
 *       500:
 *         description: Internal server error
 *
 *   post:
 *     summary: Create a new appointment title for a company
 *     tags: [Appointment]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tire Rotation
 *                 description: Title name (must be unique per company)
 *     responses:
 *       201:
 *         description: Title created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Appointment title created successfully }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 7 }
 *                     name: { type: string, example: Tire Rotation }
 *                     companyId: { type: integer, example: 10 }
 *       400:
 *         description: Validation error or duplicate title
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               missingName:
 *                 value: { success: false, message: name is required }
 *               duplicate:
 *                 value: { success: false, message: Appointment title already exists }
 *       500:
 *         description: Internal server error
 */

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdStr } = await props.params;
    const companyId = Number(companyIdStr);

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid companyId" },
        { status: 400 },
      );
    }

    const data = await db.appointmentTitle.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdStr } = await props.params;
    const companyId = Number(companyIdStr);

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "Invalid companyId" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "name is required" },
        { status: 400 },
      );
    }

    const existing = await db.appointmentTitle.findFirst({
      where: { name, companyId },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Appointment title already exists" },
        { status: 400 },
      );
    }

    const data = await db.appointmentTitle.create({
      data: { name, companyId },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Appointment title created successfully",
        data,
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

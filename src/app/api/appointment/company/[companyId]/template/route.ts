import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EmailTemplateType } from "@prisma/client";

/**
 * @swagger
 * /api/appointment/company/{companyId}/template:
 *   post:
 *     summary: Create a new appointment email template for a company
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
 *               - subject
 *               - message
 *               - type
 *             properties:
 *               subject:
 *                 type: string
 *                 example: "Appointment confirmed for <VEHICLE>"
 *                 description: >
 *                   Subject line. Supports placeholders: <CLIENT>, <VEHICLE>
 *               message:
 *                 type: string
 *                 example: "Hi <CLIENT>, your <VEHICLE> appointment is on <DATE> at <BUSINESS_NAME>."
 *                 description: >
 *                   Message body. Supports placeholders:
 *                   <CLIENT>, <VEHICLE>, <DATE>, <BUSINESS_NAME>, <ADDRESS>, <PHONE>
 *               type:
 *                 type: string
 *                 enum:
 *                   - Confirmation
 *                   - Reminder
 *                 example: Confirmation
 *                 description: Template type
 *     responses:
 *       201:
 *         description: Template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Template created successfully }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 12 }
 *                     subject: { type: string }
 *                     message: { type: string }
 *                     type: { type: string, example: Confirmation }
 *                     companyId: { type: integer, example: 10 }
 *       400:
 *         description: Missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               invalidId:
 *                 value: { success: false, message: Invalid companyId }
 *               missingSubject:
 *                 value: { success: false, message: subject is required }
 *               missingMessage:
 *                 value: { success: false, message: message is required }
 *               missingType:
 *                 value: { success: false, message: type is required }
 *               invalidType:
 *                 value: { success: false, message: "type must be one of: Confirmation, Reminder" }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Internal server error
 */

const VALID_TYPES: EmailTemplateType[] = ["Confirmation", "Reminder"];

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
    const { subject, message, type } = body;

    if (!subject || !String(subject).trim()) {
      return NextResponse.json(
        { success: false, message: "subject is required" },
        { status: 400 },
      );
    }

    if (!message || !String(message).trim()) {
      return NextResponse.json(
        { success: false, message: "message is required" },
        { status: 400 },
      );
    }

    if (!type) {
      return NextResponse.json(
        { success: false, message: "type is required" },
        { status: 400 },
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          message: `type must be one of: ${VALID_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const data = await db.emailTemplate.create({
      data: { subject, message, type, companyId },
    });

    return NextResponse.json(
      { success: true, message: "Template created successfully", data },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

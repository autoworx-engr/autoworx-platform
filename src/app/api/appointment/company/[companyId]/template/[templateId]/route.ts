import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateTemplate } from "@/actions/appointment/updateTemplate";
import { deleteTemplate } from "@/actions/appointment/deleteTemplate";

/**
 * @swagger
 * /api/appointment/company/{companyId}/template/{templateId}:
 *   put:
 *     summary: Update an appointment email template belonging to a company
 *     tags: [Appointment]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer, example: 10 }
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema: { type: integer, example: 12 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *                 example: "Updated: Your <VEHICLE> appointment"
 *                 description: New subject. Supports <CLIENT>, <VEHICLE> placeholders
 *               message:
 *                 type: string
 *                 example: "Hi <CLIENT>, your appointment is on <DATE>."
 *                 description: >
 *                   New body. Supports: <CLIENT>, <VEHICLE>, <DATE>,
 *                   <BUSINESS_NAME>, <ADDRESS>, <PHONE>
 *     responses:
 *       200:
 *         description: Template updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Template updated successfully
 *       400:
 *         description: Validation error or template not found for company
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               invalidId:
 *                 value: { success: false, message: Invalid companyId or templateId }
 *               notFound:
 *                 value: { success: false, message: Template not found for this company }
 *               missingSubject:
 *                 value: { success: false, message: subject is required }
 *               missingMessage:
 *                 value: { success: false, message: message is required }
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete an appointment email template belonging to a company
 *     tags: [Appointment]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer, example: 10 }
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema: { type: integer, example: 12 }
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Template deleted successfully
 *       400:
 *         description: Template not found for this company
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: Template not found for this company
 *       500:
 *         description: Internal server error
 */

async function resolveParams(props: {
  params: Promise<{ companyId: string; templateId: string }>;
}) {
  const params = await props.params;
  return {
    companyId: Number(params.companyId),
    templateId: Number(params.templateId),
  };
}

async function getTemplate(companyId: number, templateId: number) {
  return db.emailTemplate.findFirst({ where: { id: templateId, companyId } });
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ companyId: string; templateId: string }> },
) {
  try {
    const { companyId, templateId } = await resolveParams(props);

    if (!companyId || isNaN(companyId) || !templateId || isNaN(templateId)) {
      return NextResponse.json(
        { success: false, message: "Invalid companyId or templateId" },
        { status: 400 },
      );
    }

    const template = await getTemplate(companyId, templateId);
    if (!template) {
      return NextResponse.json(
        { success: false, message: "Template not found for this company" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { subject, message } = body;

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

    await updateTemplate({ id: templateId, subject, message });

    return NextResponse.json({
      success: true,
      message: "Template updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ companyId: string; templateId: string }> },
) {
  try {
    const { companyId, templateId } = await resolveParams(props);

    if (!companyId || isNaN(companyId) || !templateId || isNaN(templateId)) {
      return NextResponse.json(
        { success: false, message: "Invalid companyId or templateId" },
        { status: 400 },
      );
    }

    const template = await getTemplate(companyId, templateId);
    if (!template) {
      return NextResponse.json(
        { success: false, message: "Template not found for this company" },
        { status: 400 },
      );
    }

    await deleteTemplate(templateId);

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

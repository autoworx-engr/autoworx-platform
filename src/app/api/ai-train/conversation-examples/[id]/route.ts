import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/ai-train/conversation-examples/{id}:
 *   get:
 *     summary: Get conversation example by ID
 *     tags: [Conversation Examples]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: Retrieved successfully
 *       404:
 *         description: Not found
 */
export async function GET(
  _: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const id = Number(params.id);

  const data = await db.conversationExample.findUnique({ where: { id } });

  if (!data) {
    return NextResponse.json(
      { success: false, message: "Conversation example not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Conversation example retrieved",
    data,
  });
}

/**
 * @swagger
 * /api/ai-train/conversation-examples/{id}:
 *   patch:
 *     summary: Update conversation example
 *     tags: [Conversation Examples]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrl:
 *                 type: string
 *               extractedText:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated successfully
 *       404:
 *         description: Not found
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const id = Number(params.id);
  const body = await req.json();

  const exists = await db.conversationExample.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json(
      { success: false, message: "Conversation example not found" },
      { status: 404 },
    );
  }

  const data = await db.conversationExample.update({
    where: { id },
    data: {
      imageUrl: body.imageUrl,
      extractedText: body.extractedText,
      notes: body.notes,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Conversation example updated",
    data,
  });
}

/**
 * @swagger
 * /api/ai-train/conversation-examples/{id}:
 *   delete:
 *     summary: Delete conversation example
 *     tags: [Conversation Examples]
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
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 */
export async function DELETE(
  _: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const id = Number(params.id);

  await db.conversationExample.delete({ where: { id } });

  return NextResponse.json({
    success: true,
    message: "Conversation example deleted",
  });
}

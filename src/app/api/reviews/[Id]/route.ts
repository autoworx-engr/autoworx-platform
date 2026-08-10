import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/reviews/{Id}:
 *   patch:
 *     summary: Update a review
 *     description: Update rating and message of an existing review.
 *     tags:
 *       - Reviews
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 12
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rate:
 *                 type: number
 *                 example: 4.5
 *                 description: Updated rating value
 *               message:
 *                 type: string
 *                 example: Updated review message
 *                 description: Updated review message
 *     responses:
 *       200:
 *         description: Review updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 12
 *                     rate:
 *                       type: number
 *                       example: 4.5
 *                     message:
 *                       type: string
 *                       example: Updated review message
 *                     companyId:
 *                       type: integer
 *                       example: 5
 *                     sendCompanyId:
 *                       type: integer
 *                       example: 2
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid request data
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Review not found
 *       500:
 *         description: Failed to update review
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to update review
 *
 *   delete:
 *     summary: Delete a review
 *     description: Deletes a review by its ID.
 *     tags:
 *       - Reviews
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 12
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Review deleted successfully
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Review not found
 *       500:
 *         description: Failed to delete review
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to delete review
 */

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ Id: string }> },
) {
  const params = await props.params;
  try {
    const id = Number(params.Id);
    const body = await req.json();

    const { rate, message } = body;

    const review = await db.reviews.update({
      where: { id },
      data: {
        rate,
        message,
      },
    });

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to update review" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ Id: string }> },
) {
  const params = await props.params;
  try {
    const id = Number(params.Id);

    await db.reviews.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to delete review" },
      { status: 500 },
    );
  }
}

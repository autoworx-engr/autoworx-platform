import {
  updateColumn,
  deleteColumn,
} from "@/actions/pipelines/pipelinesColumn";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/sales/columns/{id}:
 *   put:
 *     summary: Update an existing pipeline column
 *     tags: [Sales Pipeline Columns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pipeline column ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - order
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *               order:
 *                 type: integer
 *               textColor:
 *                 type: string
 *               bgColor:
 *                 type: string
 *     responses:
 *       200:
 *         description: Column updated successfully
 *       400:
 *         description: Missing required fields or invalid ID
 *       500:
 *         description: Failed to update column
 */
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { title, type, order, textColor, bgColor } = body;

    if (!title || !type || order === undefined) {
      return NextResponse.json(
        { success: false, error: "Title, type, and order are required" },
        { status: 400 },
      );
    }

    await updateColumn(id, title, type, order, textColor, bgColor);

    return NextResponse.json({
      success: true,
      message: "Column updated successfully",
    });
  } catch (error: any) {
    console.error(
      `Error in PUT /api/pipeline/sales/columns/${params.id}:`,
      error,
    );
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update column" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/pipeline/sales/columns/{id}:
 *   delete:
 *     summary: Delete a pipeline column
 *     tags: [Sales Pipeline Columns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pipeline column ID
 *     responses:
 *       200:
 *         description: Column deleted successfully
 *       400:
 *         description: Invalid ID
 *       500:
 *         description: Failed to delete column
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid ID" },
        { status: 400 },
      );
    }

    await deleteColumn(id);

    return NextResponse.json({
      success: true,
      message: "Column deleted successfully",
    });
  } catch (error: any) {
    console.error(`Error in DELETE /api/pipeline/columns/${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete column" },
      { status: 500 },
    );
  }
}

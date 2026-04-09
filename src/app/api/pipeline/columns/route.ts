import { getColumnsByType, createColumn } from "@/actions/pipelines/pipelinesColumn";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/columns:
 *   get:
 *     summary: Get pipeline columns by type
 *     tags: [Pipeline Columns]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Pipeline type (e.g. sales, shop)
 *     responses:
 *       200:
 *         description: Pipeline columns fetched successfully
 *       400:
 *         description: Type is required
 *       500:
 *         description: Failed to fetch columns
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json({ success: false, error: "Type is required" }, { status: 400 });
    }

    const columns = await getColumnsByType(type);

    return NextResponse.json({ success: true, data: columns });
  } catch (error: any) {
    console.error("Error in GET /api/pipeline/columns:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch columns" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/pipeline/columns:
 *   post:
 *     summary: Create a new pipeline column
 *     tags: [Pipeline Columns]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *               textColor:
 *                 type: string
 *               bgColor:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pipeline column created successfully
 *       400:
 *         description: Title and type are required
 *       500:
 *         description: Failed to create column
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, type, textColor, bgColor } = body;

    if (!title || !type) {
      return NextResponse.json(
        { success: false, error: "Title and type are required" },
        { status: 400 }
      );
    }

    const newColumn = await createColumn(title, type, textColor, bgColor);

    return NextResponse.json({ success: true, data: newColumn });
  } catch (error: any) {
    console.error("Error in POST /api/pipeline/columns:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create column" },
      { status: 500 }
    );
  }
}

import { createColumn } from "@/actions/pipelines/pipelinesColumn";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/shop/create-column:
 *   post:
 *     summary: Create a new column in the shop pipeline
 *     tags: [Shop Pipeline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: In Progress
 *               textColor:
 *                 type: string
 *                 nullable: true
 *                 example: "#000000"
 *               bgColor:
 *                 type: string
 *                 nullable: true
 *                 example: "#ffffff"
 *     responses:
 *       200:
 *         description: Column created successfully
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
 *                   example: Column created successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request
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
 *                   example: Title is required
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const body = await req.json();
    const { title, textColor, bgColor } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Title is required" },
        { status: 400 },
      );
    }

    const data = await createColumn(
      title,
      "shop",
      textColor,
      bgColor,
      principal.companyId,
    );

    return NextResponse.json({
      success: true,
      message: "Column created successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create column",
      },
      { status: 500 },
    );
  }
}

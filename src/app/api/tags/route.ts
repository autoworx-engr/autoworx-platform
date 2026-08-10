import { getTags } from "@/actions/tag/getTags";
import newTag from "@/actions/tag/newTag";
import { deleteTag } from "@/actions/tag/deleteTag";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Get all tags for the company
 *     description: Returns all tags, optionally filtered by type. Used in pipeline tag selectors.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [GENERAL, SALES, CLIENT, INVENTORY]
 *         description: Filter tags by type
 *         example: GENERAL
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: [name, createdAt]
 *           default: createdAt
 *         description: Field to sort by
 *         example: name
 *       - in: query
 *         name: sortOrder
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort direction
 *         example: asc
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
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
 *                   example: Tags retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: VIP
 *                       textColor:
 *                         type: string
 *                         example: "#ffffff"
 *                       bgColor:
 *                         type: string
 *                         example: "#ff0000"
 *                       type:
 *                         type: string
 *                         example: GENERAL
 *                       companyId:
 *                         type: number
 *                         example: 1
 *       500:
 *         description: Internal server error
 *
 *   post:
 *     summary: Create a new tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
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
 *                 example: VIP
 *               textColor:
 *                 type: string
 *                 example: "#ffffff"
 *               bgColor:
 *                 type: string
 *                 example: "#ff0000"
 *               type:
 *                 type: string
 *                 enum: [GENERAL, SALES, CLIENT, INVENTORY]
 *                 example: GENERAL
 *     responses:
 *       200:
 *         description: Tag created successfully
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
 *                   example: Tag created successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request or tag already exists
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete a tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: number
 *                 example: 1
 *     responses:
 *       200:
 *         description: Tag deleted successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type") ?? undefined;
    const sortBy = (searchParams.get("sortBy") ?? "createdAt") as
      | "name"
      | "createdAt";
    const sortOrder = (searchParams.get("sortOrder") ?? "asc") as
      | "asc"
      | "desc";

    const companyIdParam = searchParams.get("companyId");
    if (!companyIdParam) {
      return NextResponse.json(
        { success: false, message: "companyId is required" },
        { status: 400 },
      );
    }
    const companyId = parseInt(companyIdParam);
    if (isNaN(companyId)) {
      return NextResponse.json(
        { success: false, message: "companyId must be a number" },
        { status: 400 },
      );
    }

    const result = await getTags(type, companyId);
    const tags = (result.data ?? []) as any[];

    const validSortBy = ["name", "createdAt"].includes(sortBy)
      ? sortBy
      : "createdAt";
    const validSortOrder = sortOrder === "desc" ? -1 : 1;

    const sorted = [...tags].sort((a, b) => {
      const aVal = a[validSortBy];
      const bVal = b[validSortBy];
      if (aVal < bVal) return -1 * validSortOrder;
      if (aVal > bVal) return 1 * validSortOrder;
      return 0;
    });

    return NextResponse.json({
      success: true,
      message: "Tags retrieved successfully",
      data: sorted,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to retrieve tags",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, textColor, bgColor, type, companyId } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "name is required" },
        { status: 400 },
      );
    }

    const result = await newTag({ name, textColor, bgColor, type, companyId });

    if (result.type === "error") {
      return NextResponse.json(
        { success: false, message: result.message || "Failed to create tag" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tag created successfully",
      data: result.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create tag",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "id is required" },
        { status: 400 },
      );
    }

    await deleteTag(id);

    return NextResponse.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to delete tag",
      },
      { status: 500 },
    );
  }
}

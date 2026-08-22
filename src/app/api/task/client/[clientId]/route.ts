import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @swagger
 * /api/task/client/{clientId}:
 *   get:
 *     summary: Get tasks by clientId
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 12
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Paginated tasks list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 45
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ clientId: string }> },
) {
  const params = await props.params;
  try {
    const clientId = Number(params.clientId);

    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    const skip = (page - 1) * limit;

    const where = { clientId, status: "pending" as const };

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          taskUser: true,
          client: true,
          lead: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.task.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: tasks,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeClientAccess } from "../_authorizeClient";

/**
 * @swagger
 * /api/client/client-details/{id}/tasks:
 *   get:
 *     summary: Get client's tasks (paginated)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Client ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Client tasks fetched successfully
 *       401:
 *         description: Unauthorized - missing or invalid auth principal
 *       403:
 *         description: Forbidden - record belongs to another company
 *       404:
 *         description: Client not found
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const access = await authorizeClientAccess(req, params.id);
    if ("error" in access) return access.error;
    const { clientId } = access;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "10") || 10,
      100,
    );

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where: { clientId, status: "pending" },
        include: {
          taskUser: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.task.count({ where: { clientId, status: "pending" } }),
    ]);

    return NextResponse.json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + tasks.length < total,
      },
    });
  } catch (error) {
    console.error("CLIENT TASK FETCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch client tasks" },
      { status: 500 },
    );
  }
}

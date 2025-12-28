import { getColumnsByType } from "@/actions/pipelines/pipelinesColumn";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/columns:
 *   post:
 *     summary: Get columns by type
 *     tags: [Pipelines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Columns list
 */
export async function POST(req: Request) {
  const { type } = await req.json();
  const columns = await getColumnsByType(type);
  return NextResponse.json(columns);
}

import { getColumnsByType } from "@/actions/pipelines/pipelinesColumn";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

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
export async function POST(req: NextRequest) {
  const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await req.json();
  const columns = await getColumnsByType(type, companyId);
  return NextResponse.json(columns);
}

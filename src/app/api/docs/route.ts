import { NextResponse } from "next/server";
import { swaggerSpec } from "@/lib/swagger";

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: Get OpenAPI/Swagger specification
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: OpenAPI specification
 */
export async function GET() {
  return NextResponse.json(swaggerSpec);
}

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/admin/company/{id}/clients:
 *   get:
 *     summary: Get all clients of a company
 *     description: Retrieve a list of all clients under a specific company with basic information including sales agent status.
 *     tags:
 *       - Company Clients
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Company ID
 *         schema:
 *           type: integer
 *           example: 4
 *     responses:
 *       200:
 *         description: Clients fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 12
 *                   firstName:
 *                     type: string
 *                     example: John
 *                   lastName:
 *                     type: string
 *                     nullable: true
 *                     example: Doe
 *                   email:
 *                     type: string
 *                     nullable: true
 *                     example: john@example.com
 *                   mobile:
 *                     type: string
 *                     nullable: true
 *                     example: +1234567890
 *                   isSalesAgent:
 *                     type: boolean
 *                     example: true
 *       400:
 *         description: Invalid company ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid company id
 *       500:
 *         description: Failed to fetch clients or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Failed to fetch clients
 *                 error:
 *                   type: object
 *                   nullable: true
 */

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const companyId = Number(params.id);

    const clients = await db.client.findMany({
      where: { companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        isSalesAgent: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch clients", error },
      { status: 500 },
    );
  }
}

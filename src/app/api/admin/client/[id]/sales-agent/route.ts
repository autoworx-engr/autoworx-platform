import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/admin/client/{id}/sales-agent:
 *   patch:
 *     summary: Update client sales agent permission
 *     description: Enable or disable sales agent access for a specific client. If enabled while the company sales agent feature is disabled, it will automatically enable it at the company level.
 *     tags:
 *       - Clients
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Client ID
 *         schema:
 *           type: integer
 *           example: 123
 *     requestBody:
 *       required: true
 *       description: Sales agent permission payload
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isSalesAgent
 *             properties:
 *               isSalesAgent:
 *                 type: boolean
 *                 description: Toggle sales agent conversation access for the client
 *                 example: true
 *     responses:
 *       200:
 *         description: Client sales agent permission updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Client sales agent permission updated successfully
 *       400:
 *         description: Invalid client ID or bad request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid client ID
 *       404:
 *         description: Client or company not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Client not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 *                 error:
 *                   type: object
 *                   nullable: true
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const clientId = Number(params.id);
    const { isSalesAgent } = await req.json();
    console.log("body", isSalesAgent);
    const client = await db.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 },
      );
    }

    const company = await db.company.findUnique({
      where: { id: client.companyId },
    });

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 },
      );
    }

    // If turning ON client but company is OFF
    if (isSalesAgent === true && company.isSalesAgent === false) {
      await db.$transaction([
        db.company.update({
          where: { id: company.id },
          data: { isSalesAgent: true },
        }),
        db.client.update({
          where: { id: clientId },
          data: { isSalesAgent: true },
        }),
      ]);
    } else {
      await db.client.update({
        where: { id: clientId },
        data: { isSalesAgent },
      });
    }

    revalidatePath("/dashboard/settings/ai-train");
    revalidatePath("/dashboard/communication/client");
    return NextResponse.json({
      message: "Client sales agent permission updated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error", error },
      { status: 500 },
    );
  }
}

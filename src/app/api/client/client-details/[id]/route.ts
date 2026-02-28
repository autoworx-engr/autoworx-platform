import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Client management APIs
 */

const updateClientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  customerCompany: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isFleet: z.boolean().optional(),
  isStarred: z.boolean().optional(),
});

/**
 * @swagger
 * /api/client/client-details/{id}:
 *   get:
 *     summary: Get client details
 *     description: Retrieve single client details by client ID
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Client ID
 *         schema:
 *           type: integer
 *           example: 12
 *     responses:
 *       200:
 *         description: Client fetched successfully
 *       404:
 *         description: Client not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "Invalid client ID" },
        { status: 400 },
      );
    }

    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        tag: true,
        source: true,
        fleet: true,
        conversationsTrack: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("GET CLIENT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch client" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/client/client-details/{id}:
 *   patch:
 *     summary: Update client
 *     description: Update client information
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Client ID
 *         schema:
 *           type: integer
 *           example: 12
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               mobile:
 *                 type: string
 *                 example: "017XXXXXXXX"
 *               countryCode:
 *                 type: string
 *                 example: BD
 *               email:
 *                 type: string
 *                 example: john@gmail.com
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               zip:
 *                 type: string
 *               customerCompany:
 *                 type: string
 *                 example: ABC Motors
 *               notes:
 *                 type: string
 *               isFleet:
 *                 type: boolean
 *                 example: false
 *               isStarred:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Client updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Client not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "Invalid client ID" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const validatedData = updateClientSchema.parse(body);

    const existingClient = await db.client.findUnique({
      where: { id: clientId },
    });

    if (!existingClient) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 },
      );
    }

    const updatedClient = await db.client.update({
      where: { id: clientId },
      data: validatedData,
    });

    return NextResponse.json({
      success: true,
      message: "Client updated successfully",
      data: updatedClient,
    });
  } catch (error: any) {
    console.error("UPDATE CLIENT ERROR:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, message: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update client" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/client/client-details/{id}:
 *   delete:
 *     summary: Delete client
 *     description: Delete a client by ID
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Client ID
 *         schema:
 *           type: integer
 *           example: 12
 *     responses:
 *       200:
 *         description: Client deleted successfully
 *       404:
 *         description: Client not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "Invalid client ID" },
        { status: 400 },
      );
    }

    const existingClient = await db.client.findUnique({
      where: { id: clientId },
    });

    if (!existingClient) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 },
      );
    }

    await db.client.delete({
      where: { id: clientId },
    });

    return NextResponse.json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CLIENT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete client" },
      { status: 500 },
    );
  }
}

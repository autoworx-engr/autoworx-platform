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
  sourceId: z.number().int().nullable().optional(),
  tagId: z.number().int().nullable().optional(),
  notes: z.string().optional().nullable(),
  isFleet: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  photo: z.string().optional(),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ClientDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 12
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           nullable: true
 *           example: Doe
 *         mobile:
 *           type: string
 *           nullable: true
 *           example: "017XXXXXXXX"
 *         countryCode:
 *           type: string
 *           nullable: true
 *           example: BD
 *         email:
 *           type: string
 *           nullable: true
 *           example: john@gmail.com
 *         address:
 *           type: string
 *           nullable: true
 *           example: 123 Main St
 *         city:
 *           type: string
 *           nullable: true
 *           example: Dhaka
 *         state:
 *           type: string
 *           nullable: true
 *           example: Dhaka
 *         zip:
 *           type: string
 *           nullable: true
 *           example: "1207"
 *         isFleet:
 *           type: boolean
 *           nullable: true
 *           example: false
 *         photo:
 *           type: string
 *           example: /images/default.png
 *         sourceId:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         converted:
 *           type: boolean
 *           nullable: true
 *           example: false
 *         companyId:
 *           type: integer
 *           example: 1
 *         customerCompany:
 *           type: string
 *           nullable: true
 *           example: ABC Motors
 *         tagId:
 *           type: integer
 *           nullable: true
 *           example: 4
 *         notes:
 *           type: string
 *           nullable: true
 *         leadId:
 *           type: integer
 *           nullable: true
 *         isStarred:
 *           type: boolean
 *           nullable: true
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         tag:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *               example: 4
 *             name:
 *               type: string
 *               example: VIP
 *             textColor:
 *               type: string
 *               example: "#FFFFFF"
 *             bgColor:
 *               type: string
 *               example: "#FF0000"
 *             type:
 *               type: string
 *               example: GENERAL
 *         source:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *               example: 2
 *             name:
 *               type: string
 *               example: Google Ads
 *             companyId:
 *               type: integer
 *               example: 1
 *         fleet:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *               example: 3
 *             clientId:
 *               type: integer
 *               example: 12
 *             fleetName:
 *               type: string
 *               example: John Doe
 *             contactName:
 *               type: string
 *               example: John
 *             preferredPaymentTerm:
 *               type: string
 *               nullable: true
 *               example: Net 30
 *         conversationsTrack:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *               example: 5
 *             clientId:
 *               type: integer
 *               example: 12
 *             emailIsRead:
 *               type: boolean
 *               example: true
 *             smsIsRead:
 *               type: boolean
 *               example: true
 *             emailIsUnReadCount:
 *               type: integer
 *               example: 0
 *             smsUnReadCount:
 *               type: integer
 *               example: 0
 *         Vehicle:
 *           type: array
 *           description: All vehicles belonging to this client
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 42
 *               year:
 *                 type: integer
 *                 nullable: true
 *                 example: 2020
 *               make:
 *                 type: string
 *                 nullable: true
 *                 example: Honda
 *               model:
 *                 type: string
 *                 nullable: true
 *                 example: Civic
 *               vin:
 *                 type: string
 *                 nullable: true
 *                 example: 1HGCM82633A004352
 *               license:
 *                 type: string
 *                 nullable: true
 *                 example: ABC-1234
 *               clientId:
 *                 type: integer
 *                 nullable: true
 *                 example: 12
 *               companyId:
 *                 type: integer
 *                 example: 1
 */

/**
 * @swagger
 * /api/client/client-details/{id}:
 *   get:
 *     summary: Get client details
 *     description: Retrieve single client details by client ID, including tag, source, fleet, conversation tracking, and vehicles.
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ClientDetails'
 *       400:
 *         description: Invalid client ID
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
 *                   example: Invalid client ID
 *       404:
 *         description: Client not found
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
 *                   example: Client not found
 *       500:
 *         description: Internal server error
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
 *                   example: Failed to fetch client
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
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
        Vehicle: true,
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
 *               photo:
 *                 type: string
 *                 example: "https://example.com/photo.jpg"
 *     responses:
 *       200:
 *         description: Client updated successfully
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
 *                   example: Client updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 12
 *                     firstName:
 *                       type: string
 *                       example: John
 *                     lastName:
 *                       type: string
 *                       nullable: true
 *                       example: Doe
 *                     mobile:
 *                       type: string
 *                       nullable: true
 *                       example: "017XXXXXXXX"
 *                     countryCode:
 *                       type: string
 *                       nullable: true
 *                       example: BD
 *                     email:
 *                       type: string
 *                       nullable: true
 *                       example: john@gmail.com
 *                     address:
 *                       type: string
 *                       nullable: true
 *                     city:
 *                       type: string
 *                       nullable: true
 *                     state:
 *                       type: string
 *                       nullable: true
 *                     zip:
 *                       type: string
 *                       nullable: true
 *                     customerCompany:
 *                       type: string
 *                       nullable: true
 *                       example: ABC Motors
 *                     notes:
 *                       type: string
 *                       nullable: true
 *                     isFleet:
 *                       type: boolean
 *                       nullable: true
 *                       example: false
 *                     isStarred:
 *                       type: boolean
 *                       nullable: true
 *                       example: true
 *                     photo:
 *                       type: string
 *                       example: "https://example.com/photo.jpg"
 *                     sourceId:
 *                       type: integer
 *                       nullable: true
 *                     tagId:
 *                       type: integer
 *                       nullable: true
 *                     companyId:
 *                       type: integer
 *                       example: 1
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid client ID or request validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   oneOf:
 *                     - type: string
 *                     - type: array
 *                       items:
 *                         type: object
 *                   example: Invalid client ID
 *       404:
 *         description: Client not found
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
 *                   example: Client not found
 *       500:
 *         description: Internal server error
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
 *                   example: Failed to update client
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
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
 *                   example: Client deleted successfully
 *       400:
 *         description: Invalid client ID
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
 *                   example: Invalid client ID
 *       404:
 *         description: Client not found
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
 *                   example: Client not found
 *       500:
 *         description: Internal server error
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
 *                   example: Failed to delete client
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
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

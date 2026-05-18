import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { addVehicle } from "@/actions/vehicle/addVehicle";
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { writeAuditLog } from "@/lib/copilot/audit";

/**
 * @swagger
 * /api/vehicle/client/{clientId}:
 *   post:
 *     summary: Add a vehicle to an existing client
 *     description: |
 *       Creates a vehicle record linked to the given client. Used by the AI
 *       copilot. Authenticated via Bearer JWT. Multi-tenant safety: verifies
 *       the client belongs to the JWT's company (404 otherwise). addVehicle is
 *       idempotent — if a vehicle with the same year+make+model already exists
 *       for this client, the existing record is returned.
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema: { type: integer, example: 42 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: integer, example: 7 }
 *               make: { type: string, example: "Honda" }
 *               model: { type: string, example: "Civic" }
 *               year: { type: integer, example: 2020 }
 *               submodel: { type: string }
 *               type: { type: string }
 *               transmission: { type: string }
 *               engineSize: { type: string }
 *               license: { type: string }
 *               vin: { type: string }
 *               notes: { type: string }
 *               other: { type: string, description: "Free-text description if make/model/year not known" }
 *     responses:
 *       201: { description: Vehicle created or already exists }
 *       400: { description: Validation error }
 *       401: { description: Missing or invalid Bearer token }
 *       404: { description: Client not found (or belongs to a different company) }
 *       500: { description: Internal server error }
 */

const CreateVehicleBodySchema = z
  .object({
    userId: z.number().int().positive(),
    make: z.string().optional(),
    model: z.string().optional(),
    year: z.number().int().optional(),
    submodel: z.string().optional(),
    type: z.string().optional(),
    transmission: z.string().optional(),
    engineSize: z.string().optional(),
    license: z.string().optional(),
    vin: z.string().optional(),
    notes: z.string().optional(),
    other: z.string().optional(),
  })
  .refine(
    (d) => {
      const hasYMM =
        typeof d.make === "string" &&
        d.make.trim().length > 0 &&
        typeof d.model === "string" &&
        d.model.trim().length > 0 &&
        typeof d.year === "number";
      const hasOther = typeof d.other === "string" && d.other.trim().length > 0;
      return hasYMM || hasOther;
    },
    {
      message:
        "Provide either make + model + year, or a free-text 'other' description of the vehicle.",
      path: ["make"],
    },
  );

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ clientId: string }> },
): Promise<NextResponse> {
  const startTime = Date.now();
  const { clientId: clientIdParam } = await context.params;

  const jwtCompanyId = await getCompanyIdFromBearer(req);
  if (jwtCompanyId === null) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const clientId = parseInt(clientIdParam, 10);
  if (isNaN(clientId)) {
    return NextResponse.json(
      { success: false, message: "Invalid client ID" },
      { status: 400 },
    );
  }

  const client = await db.client.findFirst({
    where: { id: clientId, companyId: jwtCompanyId },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json(
      { success: false, message: "Client not found" },
      { status: 404 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = CreateVehicleBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Validation error",
        field: parsed.error.errors[0]?.path.join(".") ?? null,
      },
      { status: 400 },
    );
  }

  const { userId, ...vehicleFields } = parsed.data;

  try {
    const result = await addVehicle({
      year: vehicleFields.year ?? 0,
      make: vehicleFields.make ?? "",
      model: vehicleFields.model ?? "",
      submodel: vehicleFields.submodel ?? "",
      type: vehicleFields.type ?? "",
      transmission: vehicleFields.transmission ?? "",
      engineSize: vehicleFields.engineSize ?? "",
      license: vehicleFields.license ?? "",
      vin: vehicleFields.vin ?? "",
      notes: vehicleFields.notes ?? "",
      other: vehicleFields.other ?? "",
      clientId,
      forceCompanyId: jwtCompanyId,
    });

    if (result.type !== "success") {
      const msg =
        "message" in result
          ? (result.message as string)
          : "Failed to add vehicle";

      await writeAuditLog({
        actor: "api",
        action: "vehicle.create",
        userId,
        companyId: jwtCompanyId,
        success: false,
        errorMessage: msg,
        latencyMs: Date.now() - startTime,
      });

      return NextResponse.json(
        { success: false, message: msg },
        { status: 400 },
      );
    }

    const vehicle = result.data;

    await writeAuditLog({
      actor: "api",
      action: "vehicle.create",
      userId,
      companyId: jwtCompanyId,
      resourceType: "Vehicle",
      resourceId: String(vehicle.id),
      input: { clientId, ...vehicleFields },
      output: { vehicleId: vehicle.id },
      success: true,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Vehicle added successfully",
        data: {
          vehicleId: vehicle.id,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          clientId,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add vehicle";

    await writeAuditLog({
      actor: "api",
      action: "vehicle.create",
      userId,
      companyId: jwtCompanyId,
      success: false,
      errorMessage,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 },
    );
  }
}

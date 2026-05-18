import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addCustomer } from "@/actions/client/add";
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { writeAuditLog } from "@/lib/copilot/audit";
import { ensureCountryCode } from "./ensureCountryCode";

/**
 * @swagger
 * /api/client/company/{companyId}:
 *   post:
 *     summary: Create a new client for a company
 *     description: |
 *       Creates a client record. Used by the AI copilot via internalApiClient.
 *       Authenticated via Bearer JWT. The companyId in the URL must match the
 *       companyId claim in the JWT — 403 on mismatch. Requires at least one
 *       contact method (phone or email). Returns 409 if a client with the same
 *       email or mobile already exists.
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer, example: 4 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, firstName]
 *             properties:
 *               userId: { type: integer, example: 7 }
 *               firstName: { type: string, example: "Jane" }
 *               lastName: { type: string, example: "Smith" }
 *               mobile: { type: string, example: "5551234567" }
 *               email: { type: string, example: "jane@example.com" }
 *               countryCode: { type: string, example: "US" }
 *               address: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               zip: { type: string }
 *               customerCompany: { type: string }
 *     responses:
 *       201: { description: Client created successfully }
 *       400: { description: Validation error }
 *       401: { description: Missing or invalid Bearer token }
 *       403: { description: JWT companyId does not match URL companyId }
 *       409: { description: Client already exists (duplicate email or mobile) }
 *       500: { description: Internal server error }
 */

const CreateClientBodySchema = z
  .object({
    userId: z.number().int().positive(),
    firstName: z.string().min(1, "firstName is required"),
    lastName: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    countryCode: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    customerCompany: z.string().optional(),
  })
  .refine(
    (d) => {
      const hasPhone =
        typeof d.mobile === "string" && d.mobile.trim().length > 0;
      const hasEmail = typeof d.email === "string" && d.email.trim().length > 0;
      return hasPhone || hasEmail;
    },
    {
      message:
        "At least one contact method is required — provide a phone number or an email address.",
      path: ["mobile"],
    },
  );

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ companyId: string }> },
): Promise<NextResponse> {
  const startTime = Date.now();
  const { companyId: companyIdParam } = await context.params;

  const jwtCompanyId = await getCompanyIdFromBearer(req);
  if (jwtCompanyId === null) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const urlCompanyId = parseInt(companyIdParam, 10);
  if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }
  const companyId = jwtCompanyId;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = CreateClientBodySchema.safeParse(rawBody);
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

  const { userId, ...clientFields } = parsed.data;
  const mobile = ensureCountryCode(
    clientFields.mobile,
    clientFields.countryCode,
  );

  try {
    const result = await addCustomer({
      ...clientFields,
      mobile,
      forceCompanyId: companyId,
    });

    if (result.type !== "success") {
      const msg =
        "message" in result
          ? (result.message as string)
          : "Failed to create client";
      const isDuplicate =
        typeof msg === "string" && msg.toLowerCase().includes("already exists");

      await writeAuditLog({
        actor: "api",
        action: "client.create",
        userId,
        companyId,
        success: false,
        errorMessage: msg,
        latencyMs: Date.now() - startTime,
      });

      return NextResponse.json(
        { success: false, message: msg },
        { status: isDuplicate ? 409 : 400 },
      );
    }

    const newClient = result.data;

    await writeAuditLog({
      actor: "api",
      action: "client.create",
      userId,
      companyId,
      resourceType: "Client",
      resourceId: String(newClient.id),
      input: clientFields,
      output: { clientId: newClient.id },
      success: true,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Client created successfully",
        data: {
          clientId: newClient.id,
          firstName: newClient.firstName,
          lastName: newClient.lastName,
          mobile: newClient.mobile,
          email: newClient.email,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create client";

    await writeAuditLog({
      actor: "api",
      action: "client.create",
      userId,
      companyId,
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

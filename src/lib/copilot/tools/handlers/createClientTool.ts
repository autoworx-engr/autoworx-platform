import { z } from "zod";
import { db } from "@/lib/db";
import { phoneLookupWhereClause } from "@/utils/normalizePhone";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
  countryCode: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  customerCompany: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const data = input as Input;

  const result = await callInternalApi({
    method: "POST",
    path: `/api/client/company/${ctx.companyId}`,
    userId: ctx.userId,
    body: { ...data, userId: ctx.userId },
  });

  if (!result.ok) {
    const isDuplicate =
      result.status === 409 || /already exists/i.test(result.error ?? "");

    if (isDuplicate && data.mobile) {
      const phoneWhere = phoneLookupWhereClause(data.mobile);
      const existing = phoneWhere
        ? await db.client.findFirst({
            where: { companyId: ctx.companyId, OR: phoneWhere },
            select: { id: true, firstName: true, lastName: true },
          })
        : null;

      if (existing) {
        return {
          ok: true,
          data: {
            clientId: existing.id,
            firstName: existing.firstName,
            lastName: existing.lastName ?? undefined,
            wasCreated: false,
            message: `Client already exists (id ${existing.id}). Use this clientId for follow-up actions — do not call create_client again.`,
          },
        };
      }
    }

    return { ok: false, error: result.error };
  }

  const payload = result.data as {
    data: {
      clientId: number;
      firstName: string;
      lastName: string | null;
      mobile: string | null;
      email: string | null;
    };
  };
  const { clientId, firstName, lastName } = payload.data;

  return {
    ok: true,
    data: {
      clientId,
      firstName,
      lastName: lastName ?? undefined,
      wasCreated: true,
      message: `Client created (id ${clientId}). Use this clientId for any immediate follow-up actions like create_vehicle_for_client — do not re-resolve.`,
    },
  };
}

registerTool({
  name: "create_client",
  description:
    "Create a brand-new client (customer) record. Returns the new clientId on success. IMPORTANT: If you have already called create_client in this conversation and it succeeded, do NOT call it again for the same person — use the clientId from the previous result directly. Re-calling with the same phone number will fail. Before calling the first time, ALWAYS call get_client_by_name to confirm the person is not already in the system. Do NOT use this to create a lead (use create_lead) and do NOT use it for fleet clients (fleet setup must be done in the main AutoWorx app).",
  permission: "client.create",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      firstName: {
        type: "string",
        description: "Client's first name (required)",
      },
      lastName: {
        type: "string",
        description: "Client's last name",
      },
      mobile: {
        type: "string",
        description:
          "Phone number including country code when known (e.g., '+15551234567' for a US number). A bare US 10-digit number is also accepted and will be stored with the +1 prefix. At least one of mobile or email is required.",
      },
      email: {
        type: "string",
        description:
          "Email address. At least one of mobile or email is required.",
      },
      countryCode: {
        type: "string",
        description: "ISO country code (e.g., 'US')",
      },
      address: {
        type: "string",
        description: "Street address",
      },
      city: {
        type: "string",
        description: "City",
      },
      state: {
        type: "string",
        description: "State or province",
      },
      zip: {
        type: "string",
        description: "Zip or postal code",
      },
      customerCompany: {
        type: "string",
        description: "Business name (if the client represents a company)",
      },
    },
    required: ["firstName"],
  },
  execute,
});

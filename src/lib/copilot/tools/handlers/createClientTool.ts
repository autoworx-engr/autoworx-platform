import { z } from "zod";
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
    return { ok: false, error: result.error };
  }

  return { ok: true, data: result.data };
}

registerTool({
  name: "create_client",
  description:
    "Create a brand-new client (customer) record. ONLY use this for genuinely new people who are not already in the system. Before calling this, you MUST call get_client_by_name to check the person does not already exist — if they do, do not create a duplicate. Do NOT use this to create a lead (use create_lead) and do NOT use it for fleet clients (fleet setup must be done in the main AutoWorx app).",
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
          "Phone number. At least one of mobile or email is required.",
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

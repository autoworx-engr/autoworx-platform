import { z } from "zod";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  companyName: z.string().min(1),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const data = input as Input;

  const result = await callInternalApi({
    method: "POST",
    path: `/api/vendor/${ctx.companyId}`,
    userId: ctx.userId,
    body: data,
  });

  if (!result.ok) {
    if (result.status === 409) {
      return {
        ok: false,
        error: `A vendor named '${data.companyName}' already exists. Use get_vendor_by_name to find their id.`,
      };
    }
    return { ok: false, error: result.error };
  }

  const payload = result.data as {
    data: { vendorId: number; companyName: string; name: string | null };
  };
  const { vendorId, companyName, name } = payload.data;

  return {
    ok: true,
    data: {
      vendorId,
      companyName,
      name: name ?? null,
      message: `Vendor created (id ${vendorId}).`,
    },
  };
}

registerTool({
  name: "create_vendor",
  description:
    "Creates a new vendor (supplier) record for the shop. Use when the user names a vendor that doesn't exist yet. Always search first with get_vendor_by_name before creating — do not create a duplicate.",
  permission: "vendor.create",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      companyName: {
        type: "string",
        description:
          "The vendor's business/company name (required, must be unique for this shop)",
      },
      name: {
        type: "string",
        description: "Optional display label or contact name for the vendor",
      },
      email: {
        type: "string",
        description: "Vendor contact email",
      },
      phone: {
        type: "string",
        description: "Vendor contact phone number",
      },
      website: {
        type: "string",
        description: "Vendor website URL",
      },
    },
    required: ["companyName"],
  },
  execute,
});

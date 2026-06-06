import { z } from "zod";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  invoiceId: z.string().min(1),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { invoiceId } = input as Input;

  const result = await callInternalApi({
    method: "PATCH",
    path: `/api/work-order/${ctx.companyId}/${invoiceId}`,
    userId: ctx.userId,
  });

  if (!result.ok) {
    if (result.status === 404) {
      return {
        ok: false,
        error: `Invoice ${invoiceId} not found. Use get_estimates_for_client to list the client's invoices.`,
      };
    }
    if (result.status === 400) {
      return {
        ok: false,
        error:
          "That is an estimate, not an invoice. Estimates must be converted to invoices before creating a work order. Ask the user to convert it in the AutoWorx app first.",
      };
    }
    if (result.status === 409) {
      return {
        ok: false,
        error: `Invoice ${invoiceId} is already a work order. Would you like to view it or assign team members?`,
      };
    }
    return { ok: false, error: result.error };
  }

  const payload = result.data as {
    data: { invoiceId: string; isWorkOrder: boolean; columnTitle: string };
  };

  return {
    ok: true,
    data: {
      invoiceId: payload.data.invoiceId,
      isWorkOrder: true,
      message: `Work order created — moved to In Progress.`,
    },
  };
}

registerTool({
  name: "create_work_order",
  description:
    "Converts an existing invoice into a work order (moves it to 'In Progress'). The invoice must already exist — estimates cannot become work orders directly. Use get_estimates_for_client with type 'Invoice' to list a client's invoices first.",
  permission: "workorder.create",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      invoiceId: {
        type: "string",
        description:
          "The invoice ID to convert to a work order (from get_estimates_for_client with type 'Invoice').",
      },
    },
    required: ["invoiceId"],
  },
  execute,
});

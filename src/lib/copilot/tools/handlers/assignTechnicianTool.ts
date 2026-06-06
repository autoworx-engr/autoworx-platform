import { z } from "zod";
import { db } from "@/lib/db";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  invoiceId: z.string().min(1),
  invoiceItemId: z.number().int().positive(),
  userId: z.number().int().positive(),
  due: z.string(),
  date: z.string().optional(),
  amount: z.number().nonnegative().optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  note: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const data = input as Input;

  // Default amount from the InvoiceItem's labor if not provided
  let amount = data.amount;
  if (amount === undefined) {
    const item = await db.invoiceItem.findFirst({
      where: { id: data.invoiceItemId, invoiceId: data.invoiceId },
      include: { labor: true },
    });
    amount = Number(item?.labor?.charge ?? 0) * Number(item?.labor?.hours ?? 0);
  }

  const result = await callInternalApi({
    method: "POST",
    path: `/api/work-order/${ctx.companyId}/${data.invoiceId}/assign`,
    userId: ctx.userId,
    body: {
      userId: data.userId,
      invoiceItemId: data.invoiceItemId,
      date: data.date ?? new Date().toISOString(),
      due: data.due,
      amount,
      priority: data.priority ?? "Medium",
      note: data.note,
    },
  });

  if (!result.ok) {
    if (result.status === 400) {
      return {
        ok: false,
        error: `Invoice ${data.invoiceId} is not a work order. Convert it first with create_work_order.`,
      };
    }
    if (result.status === 404) {
      return { ok: false, error: result.error };
    }
    return { ok: false, error: result.error };
  }

  const payload = result.data as {
    data: {
      technicianId: number;
      userId: number;
      serviceDesc: string;
      status: string;
      priority: string;
    };
  };
  const { technicianId, serviceDesc, status, priority } = payload.data;

  // Look up the user name for a friendly confirmation message
  const user = await db.user.findFirst({
    where: { id: data.userId, companyId: ctx.companyId },
    select: { firstName: true, lastName: true },
  });
  const name = user
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : `User ${data.userId}`;

  return {
    ok: true,
    data: {
      technicianId,
      userId: data.userId,
      serviceDesc,
      status,
      priority,
      message: `Assigned ${name} to "${serviceDesc}" (${priority} priority, ${status}).`,
    },
  };
}

registerTool({
  name: "assign_technician",
  description:
    "Assigns a team member to a specific service on a work order. The invoice must already be a work order (use create_work_order first). Call get_estimate_by_number to see the work order's services and their ids, and get_team_members to find the technician by name.",
  permission: "workorder.assign",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      invoiceId: {
        type: "string",
        description: "The work order invoice ID.",
      },
      invoiceItemId: {
        type: "number",
        description:
          "The InvoiceItem id of the service to assign the technician to (from get_estimate_by_number — each item has an id).",
      },
      userId: {
        type: "number",
        description: "The team member's user id (from get_team_members).",
      },
      due: {
        type: "string",
        description: "Due date for this service assignment (ISO format).",
      },
      date: {
        type: "string",
        description:
          "Assignment date (ISO format). Defaults to today if omitted.",
      },
      amount: {
        type: "number",
        description:
          "Labor amount for this assignment. Defaults to the InvoiceItem's labor charge × hours if omitted.",
      },
      priority: {
        type: "string",
        enum: ["Low", "Medium", "High"],
        description: "Assignment priority. Defaults to Medium.",
      },
      note: {
        type: "string",
        description: "Optional manager note for the technician.",
      },
    },
    required: ["invoiceId", "invoiceItemId", "userId", "due"],
  },
  execute,
});

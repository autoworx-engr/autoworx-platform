import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({});

async function execute(_input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const templates = await db.emailTemplate.findMany({
    where: { companyId: ctx.companyId, type: "Confirmation" },
    select: { id: true, subject: true },
    orderBy: { subject: "asc" },
  });

  if (templates.length === 0) {
    return {
      ok: true,
      data: {
        message:
          "No confirmation templates exist for this company. Confirmation templates are created in the main AutoWorx app.",
        templates: [],
      },
    };
  }

  return {
    ok: true,
    data: {
      count: templates.length,
      templates: templates.map((t) => ({ id: t.id, name: t.subject })),
    },
  };
}

registerTool({
  name: "get_confirmation_templates",
  description:
    "List the company's appointment confirmation message templates. Use this when the user wants to send a confirmation message for an appointment and you need to show them which templates are available. Returns each template's id and name (the human-readable subject). If the list is empty, the company has no confirmation templates set up.",
  permission: "appointment.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {},
  },
  execute,
});

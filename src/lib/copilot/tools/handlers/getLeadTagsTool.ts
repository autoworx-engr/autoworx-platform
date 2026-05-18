import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({});

async function execute(_input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const tags = await db.tag.findMany({
    where: { companyId: ctx.companyId },
    select: {
      id: true,
      name: true,
      textColor: true,
      bgColor: true,
      type: true,
    },
    orderBy: { name: "asc" },
    take: 100,
  });

  if (tags.length === 0) {
    return {
      ok: true,
      data: {
        message:
          "No tags exist in this company yet. You can create one with the create_tag tool (after user confirmation).",
        tags: [],
      },
    };
  }

  return {
    ok: true,
    data: {
      count: tags.length,
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        textColor: t.textColor,
        bgColor: t.bgColor,
        type: t.type,
      })),
    },
  };
}

registerTool({
  name: "get_lead_tags",
  description:
    "List all tags available in the user's company. Call this before adding or removing a tag from a lead so you know what tags exist and can match the user's intent to the closest tag ID.",
  permission: "lead.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {},
  },
  execute,
});

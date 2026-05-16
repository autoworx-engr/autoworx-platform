import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  name: z.string().min(1).max(50),
  textColor: z.string().optional(),
  bgColor: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { name, textColor, bgColor } = input as Input;

  const existing = await db.tag.findFirst({
    where: {
      companyId: ctx.companyId,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true, name: true },
  });
  if (existing) {
    return {
      ok: false,
      error: `A tag named "${existing.name}" already exists (ID: ${existing.id}). Use that one instead.`,
    };
  }

  const tag = await db.tag.create({
    data: {
      name,
      textColor: textColor ?? "#374151",
      bgColor: bgColor ?? "#F3F4F6",
      type: "SALES",
      companyId: ctx.companyId,
    },
    select: { id: true, name: true, textColor: true, bgColor: true },
  });

  return {
    ok: true,
    data: {
      tagId: tag.id,
      name: tag.name,
      message: `Tag "${tag.name}" created (ID: ${tag.id}).`,
    },
  };
}

registerTool({
  name: "create_tag",
  description:
    "Create a new tag in the user's company. Only call this AFTER calling get_lead_tags to confirm no close match exists AND after the user has explicitly confirmed they want a new tag created. The system prompt requires user confirmation before this fires.",
  permission: "lead.update",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Display name for the new tag (max 50 characters)",
      },
      textColor: {
        type: "string",
        description:
          "Optional text color hex (e.g., '#1F2937'). Defaults to dark gray.",
      },
      bgColor: {
        type: "string",
        description:
          "Optional background color hex (e.g., '#FEF3C7'). Defaults to light gray.",
      },
    },
    required: ["name"],
  },
  execute,
});

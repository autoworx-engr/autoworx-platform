import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  leadId: z.number().int().positive(),
  tagId: z.number().int().positive(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { leadId, tagId } = input as Input;

  const lead = await db.lead.findFirst({
    where: { id: leadId, companyId: ctx.companyId },
    select: { id: true, clientName: true },
  });
  if (!lead) {
    return {
      ok: false,
      error: "Lead not found or does not belong to your company.",
    };
  }

  const tag = await db.tag.findFirst({
    where: { id: tagId, companyId: ctx.companyId },
    select: { id: true, name: true },
  });
  if (!tag) {
    return {
      ok: false,
      error: "Tag not found or does not belong to your company.",
    };
  }

  const existing = await db.leadTags.findFirst({
    where: { leadId, tagId },
  });
  if (!existing) {
    return {
      ok: true,
      data: {
        alreadyAbsent: true,
        message: `Tag "${tag.name}" is not on ${lead.clientName}'s lead — nothing to remove.`,
      },
    };
  }

  await db.leadTags.delete({ where: { id: existing.id } });

  return {
    ok: true,
    data: {
      message: `Removed tag "${tag.name}" from ${lead.clientName}'s lead.`,
    },
  };
}

registerTool({
  name: "remove_lead_tag",
  description:
    "Remove a tag from a lead. Both leadId and tagId must be known — call get_client_by_name to get the leadId and get_lead_tags to get the tagId. Idempotent: if the tag isn't on the lead, reports success with a note.",
  permission: "lead.update",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      leadId: {
        type: "number",
        description: "ID of the lead to remove the tag from",
      },
      tagId: { type: "number", description: "ID of the tag to remove" },
    },
    required: ["leadId", "tagId"],
  },
  execute,
});

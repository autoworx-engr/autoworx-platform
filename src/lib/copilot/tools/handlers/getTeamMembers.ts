import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  searchTerm: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { searchTerm } = input as Input;

  const words = searchTerm
    ? searchTerm.trim().split(/\s+/).filter(Boolean)
    : [];

  const users = await db.user.findMany({
    where: {
      companyId: ctx.companyId,
      ...(words.length > 0
        ? {
            AND: words.map((word) => ({
              OR: [
                { firstName: { contains: word, mode: "insensitive" as const } },
                { lastName: { contains: word, mode: "insensitive" as const } },
              ],
            })),
          }
        : {}),
    },
    select: { id: true, firstName: true, lastName: true, employeeType: true },
    take: 20,
    orderBy: { firstName: "asc" },
  });

  if (users.length === 0) {
    return {
      ok: false,
      error: searchTerm
        ? `No team members found matching '${searchTerm}'.`
        : "No team members found for this company.",
    };
  }

  return {
    ok: true,
    data: {
      matchCount: users.length,
      members: users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName ?? null,
        role: u.employeeType,
      })),
    },
  };
}

registerTool({
  name: "get_team_members",
  description:
    "Search team members by name. Returns employees for this company — use to find technicians for work order assignment. Omit searchTerm to list all team members.",
  permission: "team.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      searchTerm: {
        type: "string",
        description:
          "One or more name keywords to search by. Omit to list all team members.",
      },
    },
    required: [],
  },
  execute,
});

import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";
import type { CopilotAction } from "@/lib/copilot/canUserDo";

export type ToolContext = {
  userId: number;
  companyId: number;
  userRole: string;
};

export type ToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

export type ToolDefinition = {
  name: string;
  description: string;
  permission: CopilotAction;
  inputSchema: z.ZodTypeAny;
  anthropicInputSchema: Tool["input_schema"];
  execute: (input: unknown, ctx: ToolContext) => Promise<ToolResult>;
};

const registry = new Map<string, ToolDefinition>();

export function registerTool(def: ToolDefinition): void {
  registry.set(def.name, def);
}

export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

export function allTools(): ToolDefinition[] {
  return Array.from(registry.values());
}

export function toolsForAnthropic(): Tool[] {
  return Array.from(registry.values()).map((def) => ({
    name: def.name,
    description: def.description,
    input_schema: def.anthropicInputSchema,
  }));
}

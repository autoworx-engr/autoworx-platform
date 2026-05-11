import { canUserDo } from "@/lib/copilot/canUserDo";
import { writeAuditLog } from "@/lib/copilot/audit";
import { getTool, type ToolContext } from "@/lib/copilot/tools/registry";

export type DispatchResult = {
  toolUseId: string;
  toolName: string;
  content: string;
  isError: boolean;
};

export async function executeTool(
  toolName: string,
  rawInput: unknown,
  ctx: ToolContext,
  toolUseId: string,
  copilotSessionId?: string,
): Promise<DispatchResult> {
  const startTime = Date.now();
  const def = getTool(toolName);

  if (!def) {
    return {
      toolUseId,
      toolName,
      content: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
      isError: true,
    };
  }

  const perm = await canUserDo(def.permission, ctx);
  if (!perm.allowed) {
    await writeAuditLog({
      actor: "copilot",
      action: def.permission,
      userId: ctx.userId,
      companyId: ctx.companyId,
      success: false,
      errorMessage: perm.reason,
      latencyMs: Date.now() - startTime,
      copilotSessionId,
    });
    return {
      toolUseId,
      toolName,
      content: JSON.stringify({ error: perm.reason ?? "Permission denied." }),
      isError: true,
    };
  }

  const parsed = def.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return {
      toolUseId,
      toolName,
      content: JSON.stringify({ error: `Invalid input: ${msg}` }),
      isError: true,
    };
  }

  let result: { ok: boolean; data?: unknown; error?: string };
  try {
    result = await def.execute(parsed.data, ctx);
  } catch (err) {
    console.error(`[copilot] tool ${toolName} threw:`, err);
    await writeAuditLog({
      actor: "copilot",
      action: def.permission,
      userId: ctx.userId,
      companyId: ctx.companyId,
      input: parsed.data,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startTime,
      copilotSessionId,
    });
    return {
      toolUseId,
      toolName,
      content: JSON.stringify({
        error: "Something went wrong. Our team has been notified.",
      }),
      isError: true,
    };
  }

  await writeAuditLog({
    actor: "copilot",
    action: def.permission,
    userId: ctx.userId,
    companyId: ctx.companyId,
    input: parsed.data,
    output: result.data,
    success: result.ok,
    errorMessage: result.error,
    latencyMs: Date.now() - startTime,
    copilotSessionId,
  });

  return {
    toolUseId,
    toolName,
    content: result.ok
      ? JSON.stringify(result.data)
      : JSON.stringify({ error: result.error }),
    isError: !result.ok,
  };
}

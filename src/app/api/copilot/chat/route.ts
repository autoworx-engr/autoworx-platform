import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getAnthropic, COPILOT_MODELS } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/copilot/rateLimit";
import { buildSystemPrompt } from "@/lib/copilot/systemPrompt";
import { generateSessionSummary } from "@/lib/copilot/generateSessionSummary";
import { writeAuditLog } from "@/lib/copilot/audit";
import { toolsForAnthropic, executeTool } from "@/lib/copilot/tools/index";
import type { ToolContext } from "@/lib/copilot/tools/registry";
import type {
  MessageParam,
  ToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/messages";

const MAX_TOOL_ITERATIONS = 5;

function json401() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function json403() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  const session = await getServerSession(authOptions);
  if (!session?.user) return json401();

  const userId = Number(session.user.id);
  const companyId = session.user.companyId as number;

  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      hasCopilot: true,
      firstName: true,
      lastName: true,
      role: true,
      employeeType: true,
      company: {
        select: {
          name: true,
          industry: true,
          timezone: true,
          tax: true,
          serviceFee: true,
        },
      },
    },
  });
  if (!dbUser?.hasCopilot) return json403();

  const rateResult = checkRateLimit(userId);
  if (!rateResult.ok) {
    return Response.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)),
        },
      },
    );
  }

  const body = await req.json().catch(() => null);
  const message: string = body?.message?.trim() ?? "";
  const sessionId: string | undefined = body?.sessionId;

  if (!message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  let copilotSession = sessionId
    ? await db.copilotSession.findFirst({
        where: { id: sessionId, userId, companyId },
      })
    : null;

  if (!copilotSession) {
    copilotSession = await db.copilotSession.create({
      data: { userId, companyId, title: message.slice(0, 80) },
    });
  }

  const activeSessionId = copilotSession.id;

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  if (!copilotSession.summary && copilotSession.lastMessageAt < thirtyMinAgo) {
    const summary = await generateSessionSummary(activeSessionId);
    if (summary) {
      await db.copilotSession.update({
        where: { id: activeSessionId },
        data: { summary },
      });
    }
  }

  const priorSessions = await db.copilotSession.findMany({
    where: { userId, id: { not: activeSessionId }, summary: { not: null } },
    orderBy: { lastMessageAt: "desc" },
    take: 5,
    select: { summary: true },
  });
  const priorSummaries = priorSessions
    .map((s) => s.summary)
    .filter((s): s is string => !!s);

  const history = await db.copilotMessage.findMany({
    where: { sessionId: activeSessionId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
    take: 40,
  });

  await db.copilotMessage.create({
    data: { sessionId: activeSessionId, role: "user", content: message },
  });

  const systemPrompt = buildSystemPrompt({
    user: {
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: dbUser.role,
    },
    company: {
      name: dbUser.company?.name ?? "Your Shop",
      industry: dbUser.company?.industry,
      timezone: dbUser.company?.timezone,
      tax: Number(dbUser.company?.tax ?? 0),
      serviceFee: Number(dbUser.company?.serviceFee ?? 0),
    },
    priorSummaries,
  });

  const systemBlock = [
    {
      type: "text" as const,
      text: systemPrompt,
      cache_control: { type: "ephemeral" as const },
    },
  ];

  const baseMessages: MessageParam[] = [
    ...history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
    { role: "user" as const, content: message },
  ];

  const toolCtx: ToolContext = {
    userId,
    companyId,
    userRole: dbUser.employeeType,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      let fullText = "";
      let inputTokens = 0;
      let outputTokens = 0;
      let cachedTokens = 0;
      let toolCallCount = 0;

      try {
        const anthropic = getAnthropic();
        const mutableMessages = baseMessages.slice();

        for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
          const anthropicStream = anthropic.messages.stream({
            model: COPILOT_MODELS.default,
            max_tokens: 1024,
            system: systemBlock,
            tools: toolsForAnthropic(),
            messages: mutableMessages,
          });

          let currentToolId: string | null = null;
          let currentToolName: string | null = null;
          let currentToolInputJson = "";
          const pendingToolCalls: Array<{
            id: string;
            name: string;
            input: object;
          }> = [];

          for await (const event of anthropicStream) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                currentToolId = event.content_block.id;
                currentToolName = event.content_block.name;
                currentToolInputJson = "";
                send({
                  type: "tool_call_start",
                  toolName: currentToolName,
                });
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                const text = event.delta.text;
                fullText += text;
                send({ type: "text_delta", text });
              } else if (event.delta.type === "input_json_delta") {
                currentToolInputJson += event.delta.partial_json;
              }
            } else if (event.type === "content_block_stop" && currentToolId) {
              let parsedInput: object = {};
              try {
                parsedInput = JSON.parse(currentToolInputJson || "{}");
              } catch {}
              pendingToolCalls.push({
                id: currentToolId,
                name: currentToolName!,
                input: parsedInput,
              });
              currentToolId = null;
              currentToolName = null;
            }
          }

          const finalMsg = await anthropicStream.finalMessage();
          inputTokens += finalMsg.usage.input_tokens;
          outputTokens += finalMsg.usage.output_tokens;
          cachedTokens += finalMsg.usage.cache_read_input_tokens ?? 0;
          const cacheCreation = finalMsg.usage.cache_creation_input_tokens ?? 0;

          if (process.env.NODE_ENV !== "production") {
            console.log(
              `[copilot] iter:${iter + 1} in:${finalMsg.usage.input_tokens} out:${finalMsg.usage.output_tokens} cached:${finalMsg.usage.cache_read_input_tokens ?? 0} cacheWrite:${cacheCreation}`,
            );
          }

          if (
            finalMsg.stop_reason !== "tool_use" ||
            pendingToolCalls.length === 0
          ) {
            break;
          }

          mutableMessages.push({
            role: "assistant",
            content: finalMsg.content as MessageParam["content"],
          });

          const toolResults: ToolResultBlockParam[] = [];
          for (const tc of pendingToolCalls) {
            toolCallCount++;
            await db.copilotMessage.create({
              data: {
                sessionId: activeSessionId,
                role: "tool_call",
                content: JSON.stringify({ name: tc.name, input: tc.input }),
                toolName: tc.name,
                toolCallId: tc.id,
              },
            });

            const result = await executeTool(
              tc.name,
              tc.input,
              toolCtx,
              tc.id,
              activeSessionId,
            );
            send({
              type: "tool_result",
              toolName: tc.name,
              isError: result.isError,
            });

            toolResults.push({
              type: "tool_result",
              tool_use_id: tc.id,
              content: result.content,
              is_error: result.isError,
            });
          }

          mutableMessages.push({ role: "user", content: toolResults });
        }

        await db.copilotMessage.create({
          data: {
            sessionId: activeSessionId,
            role: "assistant",
            content: fullText,
            model: COPILOT_MODELS.default,
            inputTokens,
            outputTokens,
            cachedTokens,
          },
        });

        await db.copilotSession.update({
          where: { id: activeSessionId },
          data: {
            lastMessageAt: new Date(),
            messageCount: { increment: 2 + toolCallCount },
            tokenCount: { increment: inputTokens + outputTokens },
          },
        });

        await writeAuditLog({
          actor: "copilot",
          action: "chat.message",
          companyId,
          userId,
          copilotSessionId: activeSessionId,
          success: true,
          latencyMs: Date.now() - startTime,
          output: { inputTokens, outputTokens, toolCallCount },
        });

        if (rateResult.warning) {
          send({
            type: "done",
            sessionId: activeSessionId,
            warning: rateResult.warning,
          });
        } else {
          send({ type: "done", sessionId: activeSessionId });
        }
      } catch (err) {
        console.error("[copilot] stream error:", err);
        send({
          type: "error",
          message: "Something went wrong. Please try again.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

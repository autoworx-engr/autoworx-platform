import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getAnthropic, COPILOT_MODELS } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/copilot/rateLimit";
import { buildSystemPrompt } from "@/lib/copilot/systemPrompt";
import { generateSessionSummary } from "@/lib/copilot/generateSessionSummary";
import { writeAuditLog } from "@/lib/copilot/audit";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

function json401() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function json403() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // Auth
  const session = await getServerSession(authOptions);
  if (!session?.user) return json401();

  const userId = Number(session.user.id);
  const companyId = session.user.companyId as number;

  // Copilot gate
  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      hasCopilot: true,
      firstName: true,
      lastName: true,
      role: true,
      company: { select: { name: true, industry: true, timezone: true } },
    },
  });
  if (!dbUser?.hasCopilot) return json403();

  // Rate limit
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

  // Parse body
  const body = await req.json().catch(() => null);
  const message: string = body?.message?.trim() ?? "";
  const sessionId: string | undefined = body?.sessionId;

  if (!message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  // Load or create session
  let copilotSession = sessionId
    ? await db.copilotSession.findFirst({
        where: { id: sessionId, userId, companyId },
      })
    : null;

  if (!copilotSession) {
    copilotSession = await db.copilotSession.create({
      data: {
        userId,
        companyId,
        title: message.slice(0, 80),
      },
    });
  }

  const activeSessionId = copilotSession.id;

  // Lazy summarization fallback: session >30min old and summary is null
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

  // Prior summaries for memory (last 5 different sessions)
  const priorSessions = await db.copilotSession.findMany({
    where: { userId, id: { not: activeSessionId }, summary: { not: null } },
    orderBy: { lastMessageAt: "desc" },
    take: 5,
    select: { summary: true },
  });
  const priorSummaries = priorSessions
    .map((s) => s.summary)
    .filter((s): s is string => !!s);

  // Conversation history
  const history = await db.copilotMessage.findMany({
    where: { sessionId: activeSessionId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
    take: 40,
  });

  // Persist user message
  await db.copilotMessage.create({
    data: { sessionId: activeSessionId, role: "user", content: message },
  });

  // Build Anthropic messages with prompt caching
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
    },
    priorSummaries,
  });

  const anthropicMessages: MessageParam[] = [
    ...history.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      let fullText = "";
      let inputTokens = 0;
      let outputTokens = 0;

      try {
        const anthropic = getAnthropic();
        const anthropicStream = anthropic.messages.stream({
          model: COPILOT_MODELS.default,
          max_tokens: 1024,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: anthropicMessages,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullText += text;
            send({ type: "text_delta", text });
          }
        }

        const finalMessage = await anthropicStream.finalMessage();
        inputTokens = finalMessage.usage.input_tokens;
        outputTokens = finalMessage.usage.output_tokens;

        // Persist assistant message
        await db.copilotMessage.create({
          data: {
            sessionId: activeSessionId,
            role: "assistant",
            content: fullText,
            model: COPILOT_MODELS.default,
            inputTokens,
            outputTokens,
          },
        });

        // Update session
        await db.copilotSession.update({
          where: { id: activeSessionId },
          data: {
            lastMessageAt: new Date(),
            messageCount: { increment: 2 },
            tokenCount: { increment: inputTokens + outputTokens },
          },
        });

        // Audit log
        await writeAuditLog({
          actor: "copilot",
          action: "chat.message",
          companyId,
          userId,
          copilotSessionId: activeSessionId,
          success: true,
          latencyMs: Date.now() - startTime,
          output: { inputTokens, outputTokens },
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

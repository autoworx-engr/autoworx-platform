import { db } from "@/lib/db";
import { getAnthropic, COPILOT_MODELS } from "@/lib/anthropic";

export async function generateSessionSummary(
  sessionId: string,
): Promise<string | null> {
  try {
    const messages = await db.copilotMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    if (messages.length === 0) return null;

    const transcript = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: COPILOT_MODELS.fast,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Summarize this AutoWorx assistant conversation in 2-3 sentences. Focus on what the user was trying to accomplish and any key outcomes or information they received. Be concise.\n\n${transcript}`,
        },
      ],
    });

    const block = response.content[0];
    if (block.type !== "text") return null;
    return block.text.trim();
  } catch (err) {
    console.error("[copilot] generateSessionSummary failed:", err);
    return null;
  }
}

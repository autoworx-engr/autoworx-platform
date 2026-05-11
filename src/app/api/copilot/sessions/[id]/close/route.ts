import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { generateSessionSummary } from "@/lib/copilot/generateSessionSummary";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { id } = params;

  const copilotSession = await db.copilotSession.findFirst({
    where: { id, userId },
    select: { id: true, summary: true, messageCount: true },
  });

  if (!copilotSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if (!copilotSession.summary && copilotSession.messageCount > 0) {
    const summary = await generateSessionSummary(id);
    if (summary) {
      await db.copilotSession.update({
        where: { id },
        data: { summary },
      });
    }
  }

  return Response.json({ ok: true });
}

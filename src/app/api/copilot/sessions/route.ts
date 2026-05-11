import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);

  const sessions = await db.copilotSession.findMany({
    where: { userId },
    orderBy: { lastMessageAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      messageCount: true,
      lastMessageAt: true,
      startedAt: true,
    },
  });

  return Response.json({ sessions });
}

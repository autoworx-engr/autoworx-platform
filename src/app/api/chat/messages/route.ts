import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import pusherServer from "@/lib/pusher-server";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

function roomChannel(roomId: string) {
  return `private-chat-${roomId}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  if (!roomId) return new NextResponse("roomId required", { status: 400 });

  const messages = await db.chatMessage.findMany({
    where: { companyId: Number(session.user.companyId), roomId },
    include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { roomId, content } = (await req.json()) as {
    roomId?: string;
    content?: string;
  };

  if (!roomId || !content?.trim()) {
    return new NextResponse("roomId and content required", { status: 400 });
  }

  const message = await db.chatMessage.create({
    data: {
      companyId: Number(session.user.companyId),
      senderId: Number(session.user.id),
      roomId,
      content: content.trim(),
    },
    include: { sender: { select: { id: true, firstName: true, lastName: true } } },
  });

  await pusherServer.trigger(roomChannel(roomId), "new-message", message);

  return NextResponse.json(message);
}

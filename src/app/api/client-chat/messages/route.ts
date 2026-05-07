import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import pusherServer from "@/lib/pusher-server";
import { MessageSenderType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

function clientChannel(token: string) {
  return `private-client-${token}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return new NextResponse("token required", { status: 400 });

  const conv = await db.clientConversation.findUnique({ where: { token } });
  if (!conv) return new NextResponse("Conversation not found", { status: 404 });

  // Verify agent access OR allow public token-based client access
  const session = await getServerSession(authOptions);
  const isAgent = session?.user?.companyId === conv.companyId;
  const isPublicToken = !session; // client uses token directly, no session

  if (!isAgent && !isPublicToken) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const messages = await db.clientMessage.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({ conversation: conv, messages });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return new NextResponse("token required", { status: 400 });

  const conv = await db.clientConversation.findUnique({
    where: { token },
    include: { account: { select: { name: true } } },
  });
  if (!conv) return new NextResponse("Conversation not found", { status: 404 });

  const body = (await req.json()) as { content?: string; senderName?: string };
  if (!body.content?.trim()) return new NextResponse("content required", { status: 400 });

  // Determine sender
  const session = await getServerSession(authOptions);
  let senderType: MessageSenderType;
  let senderName: string;

  if (session?.user?.companyId === conv.companyId) {
    senderType = MessageSenderType.AGENT;
    senderName = session.user.name ?? "Agent";
  } else {
    senderType = MessageSenderType.CLIENT;
    senderName = body.senderName?.trim() || conv.account.name;
  }

  const message = await db.clientMessage.create({
    data: {
      conversationId: conv.id,
      senderType,
      senderName,
      content: body.content.trim(),
    },
  });

  // Update conversation timestamp
  await db.clientConversation.update({
    where: { id: conv.id },
    data: { updatedAt: new Date() },
  });

  // Broadcast to channel (both agent panel + client portal subscribe to same channel)
  await pusherServer.trigger(clientChannel(token), "new-message", message);

  return NextResponse.json(message);
}

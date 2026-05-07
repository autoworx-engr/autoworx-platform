/**
 * WebRTC signaling relay via Pusher.
 * Forwards offer/answer/ice-candidate events to the target user's private channel.
 */
import { authOptions } from "@/authOptions";
import pusherServer from "@/lib/pusher-server";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const body = (await req.json()) as {
    targetUserId?: number;
    event?: string;
    payload?: unknown;
  };

  const { targetUserId, event, payload } = body;

  if (!targetUserId || !event) {
    return new NextResponse("targetUserId and event required", { status: 400 });
  }

  const ALLOWED_EVENTS = [
    "call-offer",
    "call-answer",
    "ice-candidate",
    "call-hangup",
    "call-reject",
  ];
  if (!ALLOWED_EVENTS.includes(event)) {
    return new NextResponse("Unknown signal event", { status: 400 });
  }

  const targetChannel = `private-user-${targetUserId}`;
  await pusherServer.trigger(targetChannel, event, {
    fromUserId: Number(session.user.id),
    fromName: session.user.name ?? "Team member",
    payload,
  });

  return NextResponse.json({ ok: true });
}

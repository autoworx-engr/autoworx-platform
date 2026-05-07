/**
 * Pusher channel auth for unauthenticated client portal users.
 * Only allows subscribing to the specific private-client-{token} channel
 * that matches a real conversation token.
 */
import { db } from "@/lib/db";
import pusherServer from "@/lib/pusher-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id") ?? "";
  const channel = params.get("channel_name") ?? "";

  if (!channel.startsWith("private-client-")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const token = channel.slice("private-client-".length);
  const conv = await db.clientConversation.findUnique({
    where: { token },
    select: { id: true },
  });

  if (!conv) return new NextResponse("Forbidden", { status: 403 });

  const auth = pusherServer.authorizeChannel(socketId, channel);
  return NextResponse.json(auth);
}

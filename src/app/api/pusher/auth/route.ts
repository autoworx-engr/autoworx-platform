import { authOptions } from "@/authOptions";
import pusherServer from "@/lib/pusher-server";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id") ?? "";
  const channel = params.get("channel_name") ?? "";

  const userData = {
    user_id: String(session.user.id),
    user_info: {
      name: session.user.name ?? "Team member",
      companyId: session.user.companyId,
    },
  };

  let authResponse: object;

  if (channel.startsWith("presence-")) {
    authResponse = pusherServer.authorizeChannel(socketId, channel, userData);
  } else if (channel.startsWith("private-")) {
    authResponse = pusherServer.authorizeChannel(socketId, channel);
  } else {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.json(authResponse);
}

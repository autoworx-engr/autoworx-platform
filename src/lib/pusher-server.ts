import Pusher from "pusher";

declare global {
  // eslint-disable-next-line no-var
  var _pusherServer: Pusher | undefined;
}

function createPusherServer() {
  return new Pusher({
    appId: process.env.PUSHER_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
  });
}

const pusherServer: Pusher =
  globalThis._pusherServer ?? createPusherServer();

if (process.env.NODE_ENV !== "production") {
  globalThis._pusherServer = pusherServer;
}

export default pusherServer;

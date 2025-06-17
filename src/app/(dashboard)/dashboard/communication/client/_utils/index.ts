import { Client, ClientConversationTrack } from "@prisma/client";

export const isImage = (fileName: string = "") => {
  if (!fileName) return false;

  const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "webp",
    "svg",
    "tiff",
    "ico",
    "avif",
  ];
  const ext = fileName?.split(".")?.pop()?.toLowerCase();

  return imageExtensions.includes(ext ?? "");
};

export const clientSortByUpdatedMessage = (
  clients: (Client & {
    conversationsTrack?: ClientConversationTrack | null;
  })[],
) => {
  const sortedClients = clients.slice().sort((a, b) => {
    const aLastMessageSendTime = a.conversationsTrack?.sendAt
      ? new Date(a.conversationsTrack?.sendAt).getTime()
      : new Date("1970-01-01").getTime();
    const bLastMessageSendTime = b.conversationsTrack?.sendAt
      ? new Date(b.conversationsTrack?.sendAt).getTime()
      : new Date("1970-01-01").getTime();

    return bLastMessageSendTime - aLastMessageSendTime;
  });
  return sortedClients;
};

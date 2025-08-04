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
  })[]
) => {
  const sortedClients = clients.slice().sort((a, b) => {
    const aLastMessageSendTime = a.conversationsTrack?.updatedAt
      ? new Date(a.conversationsTrack?.updatedAt).getTime()
      : new Date("1970-01-01").getTime();
    const bLastMessageSendTime = b.conversationsTrack?.updatedAt
      ? new Date(b.conversationsTrack?.updatedAt).getTime()
      : new Date("1970-01-01").getTime();

    return bLastMessageSendTime - aLastMessageSendTime;
  });
  return sortedClients;
};

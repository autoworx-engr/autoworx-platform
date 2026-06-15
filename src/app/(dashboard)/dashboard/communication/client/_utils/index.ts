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

export const isAudio = (fileName: string = "") => {
  if (!fileName) return false;

  const audioExtensions = [
    "mp3",
    "wav",
    "ogg",
    "oga",
    "opus",
    "m4a",
    "webm",
    "aac",
    "amr",
    "3gp",
    "flac",
  ];
  const ext = fileName?.split(".")?.pop()?.toLowerCase();

  return audioExtensions.includes(ext ?? "");
};

export const clientSortByUpdatedMessage = (
  clients: (Client & {
    conversationsTrack?: ClientConversationTrack | null;
  })[],
) => {
  const sortedClients = clients.slice().sort((a, b) => {
    // For proper chat list ordering, we need to handle multiple scenarios:
    // 1. Clients with actual messages (SMS or Email) - sort by most recent message activity
    // 2. Clients with conversation tracks but no messages - sort by track timestamp
    // 3. Clients without conversation tracks - sort by creation date

    const aTrack = a.conversationsTrack;
    const bTrack = b.conversationsTrack;

    // Check if clients have actual messages
    const aHasMessages = !!(
      aTrack?.smsLastMessage ||
      aTrack?.emailLastMessage ||
      aTrack?.messengerLastMessage
    );
    const bHasMessages = !!(
      bTrack?.smsLastMessage ||
      bTrack?.emailLastMessage ||
      bTrack?.messengerLastMessage
    );

    // Helper function to get the best available timestamp for sorting
    const getEffectiveTimestamp = (
      track: ClientConversationTrack | null | undefined,
      hasMessages: boolean,
    ) => {
      if (!track) return 0;

      // For clients with messages, prioritize sendAt (actual message time) over updatedAt
      if (hasMessages && track.sendAt) {
        return new Date(track.sendAt).getTime();
      }

      // Fallback to updatedAt (when track was last modified)
      if (track.updatedAt) {
        return new Date(track.updatedAt).getTime();
      }

      // Last resort: createdAt
      if (track.createdAt) {
        return new Date(track.createdAt).getTime();
      }

      return 0;
    };

    // Priority 1: Clients with actual messages come first
    if (aHasMessages && !bHasMessages) {
      return -1; // a comes first
    }
    if (!aHasMessages && bHasMessages) {
      return 1; // b comes first
    }

    // Priority 2: If both have messages, sort by most recent message activity
    if (aHasMessages && bHasMessages) {
      const aTimestamp = getEffectiveTimestamp(aTrack, true);
      const bTimestamp = getEffectiveTimestamp(bTrack, true);

      // If timestamps are the same, use client ID as tiebreaker for consistent ordering
      if (aTimestamp === bTimestamp) {
        return b.id - a.id; // Higher ID first (more recent client)
      }

      // Most recent message first
      return bTimestamp - aTimestamp;
    }

    // Priority 3: Both don't have messages but have conversation tracks
    if (!aHasMessages && !bHasMessages && aTrack && bTrack) {
      const aTimestamp = getEffectiveTimestamp(aTrack, false);
      const bTimestamp = getEffectiveTimestamp(bTrack, false);

      // If timestamps are the same, use client ID as tiebreaker
      if (aTimestamp === bTimestamp) {
        return b.id - a.id;
      }

      return bTimestamp - aTimestamp;
    }

    // Priority 4: One has track, other doesn't - prioritize the one with track
    if (aTrack && !bTrack) {
      return -1;
    }
    if (!aTrack && bTrack) {
      return 1;
    }

    // Priority 5: Both don't have conversation tracks - sort by client creation date (most recent first)
    const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    // If creation dates are the same, use client ID as tiebreaker
    if (aCreatedAt === bCreatedAt) {
      return b.id - a.id;
    }

    return bCreatedAt - aCreatedAt;
  });

  return sortedClients;
};

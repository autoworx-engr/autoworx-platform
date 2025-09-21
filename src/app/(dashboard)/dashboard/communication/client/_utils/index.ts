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
    // For proper chat list ordering, we need to handle multiple scenarios:
    // 1. Clients with actual messages (SMS or Email) - sort by most recent activity
    // 2. Clients with conversation tracks but no messages - sort by track timestamp
    // 3. Clients without conversation tracks - sort by creation date
    
    const aTrack = a.conversationsTrack;
    const bTrack = b.conversationsTrack;
    
    // Check if clients have actual messages
    const aHasMessages = !!(aTrack?.smsLastMessage || aTrack?.emailLastMessage);
    const bHasMessages = !!(bTrack?.smsLastMessage || bTrack?.emailLastMessage);
    
    // Priority 1: Clients with actual messages come first
    if (aHasMessages && !bHasMessages) {
      return -1;
    }
    if (!aHasMessages && bHasMessages) {
      return 1;
    }
    
    // Priority 2: If both have messages OR both don't have messages, sort by timestamp
    if ((aHasMessages && bHasMessages) || (!aHasMessages && !bHasMessages && aTrack && bTrack)) {
      // Helper function to get the most recent timestamp from a conversation track
      const getTrackTimestamp = (track: ClientConversationTrack | null | undefined) => {
        if (!track) return 0;
        
        // Check all possible timestamps and return the most recent one
        const timestamps = [
          track.updatedAt ? new Date(track.updatedAt).getTime() : 0,
          track.sendAt ? new Date(track.sendAt).getTime() : 0,
          track.createdAt ? new Date(track.createdAt).getTime() : 0,
        ].filter(t => t > 0);
        
        return timestamps.length > 0 ? Math.max(...timestamps) : 0;
      };
      
      const aTrackTimestamp = getTrackTimestamp(aTrack);
      const bTrackTimestamp = getTrackTimestamp(bTrack);
      
      return bTrackTimestamp - aTrackTimestamp; // Most recent first
    }
    
    // Priority 3: Clients with conversation tracks (but no messages) vs clients without tracks
    if (aTrack && !bTrack) {
      return -1;
    }
    if (!aTrack && bTrack) {
      return 1;
    }
    
    // Priority 4: Both don't have conversation tracks - sort by client creation date
    const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    
    return bCreatedAt - aCreatedAt;
  });
  
  return sortedClients;
};

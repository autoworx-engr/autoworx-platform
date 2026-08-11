import { errorToast } from "@/lib/toast";
import { Client, ClientConversationTrack } from "@prisma/client";
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  AUDIO_EXTENSIONS,
  IMAGE_EXTENSIONS,
  MAX_ATTACHMENT_SIZE_MB,
  SUPPORTED_ATTACHMENT_FORMATS_LABEL,
} from "./attachmentExtensions";

export { MAX_ATTACHMENT_SIZE_MB };

export const isImage = (fileName: string = "") => {
  if (!fileName) return false;

  const ext = fileName?.split(".")?.pop()?.toLowerCase();

  return IMAGE_EXTENSIONS.includes(ext ?? "");
};

export const isAudio = (fileName: string = "") => {
  if (!fileName) return false;

  const ext = fileName?.split(".")?.pop()?.toLowerCase();

  return AUDIO_EXTENSIONS.includes(ext ?? "");
};

// For the file inputs' `accept` attribute — a first line of defense only;
// it doesn't affect drag-and-drop, so mergeNewAttachments below is the
// actual enforcement.
export const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_EXTENSIONS.map(
  (ext) => `.${ext}`,
).join(",");

export const isAllowedAttachment = (file: File) => {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext);
};

/**
 * Dedupes newly picked/dropped files against what's already staged and drops
 * anything that fails attachment validation, toasting once per rejection
 * reason. Shared by every channel composer (SMS, Email, Messenger) so the
 * file-select and drag-drop handlers stay a one-liner.
 */
export const mergeNewAttachments = (prev: File[], picked: File[]): File[] => {
  const duplicates: string[] = [];
  const unsupported: string[] = [];
  const oversized: string[] = [];

  const validNewFiles = picked.filter((file) => {
    const isDuplicate = prev.some(
      (f) =>
        f.name === file.name &&
        f.size === file.size &&
        f.lastModified === file.lastModified,
    );
    if (isDuplicate) {
      duplicates.push(file.name);
      return false;
    }

    if (!isAllowedAttachment(file)) {
      unsupported.push(file.name);
      return false;
    }
    if (file.size > MAX_ATTACHMENT_SIZE_MB * 1024 * 1024) {
      oversized.push(file.name);
      return false;
    }

    return true;
  });

  if (duplicates.length) {
    errorToast(`Already uploaded: ${duplicates.join(", ")}`);
  }
  // One toast per rejection *reason*, not per file — otherwise attaching
  // several unsupported files at once repeats the full format list each time.
  if (unsupported.length) {
    errorToast(
      `${unsupported.map((name) => `"${name}"`).join(", ")} ${
        unsupported.length > 1
          ? "are not supported file types"
          : "is not a supported file type"
      }. Supported formats: ${SUPPORTED_ATTACHMENT_FORMATS_LABEL}`,
    );
  }
  if (oversized.length) {
    errorToast(
      `${oversized.map((name) => `"${name}"`).join(", ")} exceed${
        oversized.length > 1 ? "" : "s"
      } the ${MAX_ATTACHMENT_SIZE_MB}MB limit`,
    );
  }

  return [...prev, ...validNewFiles];
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

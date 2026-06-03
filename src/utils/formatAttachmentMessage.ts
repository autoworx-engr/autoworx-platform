import { Attachment } from "@prisma/client";

/**
 * Creates a descriptive message for attachments in messages
 * @param attachments - Array of attachment objects
 * @param textMessage - Optional text message to combine with attachment description
 * @returns Formatted message string
 */
export function formatAttachmentMessage(
  attachments: Attachment[] | null | undefined,
  textMessage?: string | null,
): string {
  if (!attachments || attachments.length === 0) {
    return textMessage || "";
  }

  // Count images vs other files
  const images = attachments.filter(
    (att) =>
      att.fileName
        ?.toLowerCase()
        .match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff)$/i) ||
      att.fileType?.toLowerCase().includes("image"),
  );

  const pdfs = attachments.filter(
    (att) =>
      att.fileName?.toLowerCase().match(/\.pdf$/i) ||
      att.fileType?.toLowerCase().includes("pdf"),
  );

  const otherFiles = attachments.filter((att) => {
    const isImage =
      att.fileName
        ?.toLowerCase()
        .match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff)$/i) ||
      att.fileType?.toLowerCase().includes("image");
    const isPdf =
      att.fileName?.toLowerCase().match(/\.pdf$/i) ||
      att.fileType?.toLowerCase().includes("pdf");
    return !isImage && !isPdf;
  });

  const parts = [];

  if (images.length > 0) {
    parts.push(
      images.length === 1 ? "sent an image" : `sent ${images.length} images`,
    );
  }

  if (pdfs.length > 0) {
    parts.push(pdfs.length === 1 ? "sent a PDF" : `sent ${pdfs.length} PDFs`);
  }

  if (otherFiles.length > 0) {
    parts.push(
      otherFiles.length === 1
        ? "sent a file"
        : `sent ${otherFiles.length} files`,
    );
  }

  const attachmentText = parts.join(", ");

  // If there's both text and attachments, combine them
  if (textMessage && textMessage.trim() && textMessage.trim() !== "false") {
    return `${textMessage.trim()} — ${attachmentText}`;
  }

  return attachmentText;
}

/**
 * Creates a descriptive message for internal messages with attachments
 * Similar to the attachment message formatter but for internal communication
 */
export function formatInternalAttachmentMessage(
  message: string | null,
  attachments: any[] | null | undefined,
): string {
  // If message exists and is not "false", use it
  if (message && message.trim() && message.trim() !== "false") {
    // If there are also attachments, combine them
    if (attachments && attachments.length > 0) {
      return formatAttachmentMessage(attachments, message);
    }
    return message;
  }

  // If no valid message but there are attachments, show attachment description
  if (attachments && attachments.length > 0) {
    return formatAttachmentMessage(attachments);
  }

  // Fallback
  return message || "";
}

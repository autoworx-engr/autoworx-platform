// Supported file extensions for Communication Hub client attachments/previews.
// Grouped by kind so `isImage`/`isAudio` and the attachment allow-list all
// read from one place instead of keeping their own copies in sync by hand.

export const IMAGE_EXTENSIONS = [
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
  "heic",
];

export const AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "ogg",
  "oga",
  "opus",
  "m4a",
  // voice notes are recorded as audio/webm — see startRecording in SendSms.tsx
  "webm",
  "aac",
  "amr",
  "3gp",
  "flac",
];

export const VIDEO_EXTENSIONS = ["mp4", "mov"];

export const DOCUMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
];

// Formats users can actually receive/open through SMS, Email, and Messenger —
// deliberately excludes executables/scripts since these get sent straight to
// clients. The S3 upload pipeline itself caps every file at 50MB
// (src/actions/s3/signedURL.ts), so MAX_ATTACHMENT_SIZE_MB stays well under that.
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
];

export const MAX_ATTACHMENT_SIZE_MB = 25;

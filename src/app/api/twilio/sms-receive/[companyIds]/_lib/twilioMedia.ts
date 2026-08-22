// Helpers for downloading inbound Twilio MMS media and inferring file
// extensions from the returned MIME type. Kept here (private to the route)
// because no other route fetches Twilio media this way.

function mimeToExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/amr": "amr",
    "audio/aac": "aac",
    "audio/3gpp": "3gp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/3gpp": "3gp",
    "application/pdf": "pdf",
  };
  return map[mime.split(";")[0].trim()] || "bin";
}

export async function fetchTwilioMedia(
  url: string,
  apiKeySid: string,
  apiKeySecret: string,
): Promise<File> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${btoa(`${apiKeySid}:${apiKeySecret}`)}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Twilio media: ${response.statusText}`);
  }

  const blob = await response.blob();
  const ext = mimeToExtension(blob.type);
  const filename = `twilio-mms-${Date.now()}.${ext}`;
  return new File([blob], filename, { type: blob.type });
}

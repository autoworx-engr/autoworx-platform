import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";

ffmpeg.setFfmpegPath(ffmpegPath.path);

// Voice notes recorded in-browser (see startRecording in SendSms.tsx) come out
// as audio/webm or audio/ogg — containers iOS has no native decoder for, so an
// MMS carrying one shows up on iPhone as an undecodable "webm" file instead of
// a playable voice note. mp3 plays natively everywhere, so transcode to it
// before the file reaches S3/MMS delivery.
function needsTranscoding(file: File): boolean {
  const baseType = file.type.split(";")[0]?.trim().toLowerCase();
  if (baseType === "audio/webm" || baseType === "audio/ogg") return true;

  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "webm" || ext === "ogg" || ext === "oga" || ext === "opus";
}

export async function transcodeToMp3IfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("audio/") || !needsTranscoding(file)) return file;

  const baseType = file.type.split(";")[0]?.trim().toLowerCase();
  const inputFormat =
    baseType === "audio/ogg" || file.name.match(/\.(ogg|oga|opus)$/i)
      ? "ogg"
      : "webm";

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());

    const outputBuffer = await new Promise<Buffer>((resolve, reject) => {
      const input = new PassThrough();
      input.end(inputBuffer);

      const chunks: Buffer[] = [];
      const output = new PassThrough();
      output.on("data", (chunk) => chunks.push(chunk));
      output.on("end", () => resolve(Buffer.concat(chunks)));
      output.on("error", reject);

      ffmpeg(input)
        .inputFormat(inputFormat)
        .audioCodec("libmp3lame")
        .format("mp3")
        .on("error", reject)
        .pipe(output, { end: true });
    });

    const newName = file.name.replace(/\.\w+$/, "") + ".mp3";
    return new File([new Uint8Array(outputBuffer)], newName, {
      type: "audio/mpeg",
    });
  } catch (err) {
    console.error(
      "Voice note transcode to mp3 failed, uploading original:",
      err,
    );
    return file;
  }
}

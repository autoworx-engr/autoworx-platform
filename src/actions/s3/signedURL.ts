"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";

import { S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION!,
  credentials: {
    accessKeyId:
      process.env.AUTOWORX_AWS_ACCESS_KEY! || process.env.AWS_ACCESS_KEY!,
    secretAccessKey:
      process.env.AUTOWORX_AWS_SECRET_KEY! || process.env.AWS_SECRET_KEY!,
  },
});

// 50mb
const maxFileSize = 50 * 1024 * 1024;

// generate a random file name
const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

type SignedURLResponse = Promise<
  | { error?: undefined; success: { url: string } }
  | { error: string; success?: undefined }
>;

type GetSignedURLParams = {
  fileType: string;
  fileSize: number;
  checksum: string;
  fileName: string;
};

export async function getSignedURL({
  fileType,
  fileSize,
  checksum,
  fileName: originalFileName,
}: GetSignedURLParams): Promise<SignedURLResponse> {
  // const session = await getServerSession(authOptions); n

  // if (!session) {
  //   return { error: "not authenticated" };
  // }

  if (fileSize > maxFileSize) {
    return { error: "File size too large" };
  }

  const baseName = originalFileName.split(".")[0];
  const extension = path.extname(originalFileName);
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const fileName = `${baseName}-${uniqueSuffix}${extension}`;

  const putObjectCommand = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: fileName,
    ContentType: fileType,
    ContentLength: fileSize,
    ChecksumSHA256: checksum,
  });

  const url = await getSignedUrl(
    s3Client,
    putObjectCommand,
    { expiresIn: 60 }, // 60 seconds
  );

  return { success: { url } };
}

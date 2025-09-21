"use server";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION!,
  credentials: {
    accessKeyId:
      process.env.AUTOWORX_AWS_ACCESS_KEY! || process.env.AWS_ACCESS_KEY!,
    secretAccessKey:
      process.env.AUTOWORX_AWS_SECRET_KEY! || process.env.AWS_SECRET_KEY!,
  },
});

export async function deleteObject(url: string) {
  try {
    const key = url.split("/").slice(-1)[0];

    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    };

    return await s3Client.send(new DeleteObjectCommand(deleteParams));
  } catch (e) {
    console.error(e);
  }
}

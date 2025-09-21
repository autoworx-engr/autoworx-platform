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

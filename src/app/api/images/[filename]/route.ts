import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";
export async function GET(
  req: Request,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;
  // use serverless-safe tmp dir
  const uploadDir = "/tmp/uploads";
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filename).toLowerCase();
    let contentType = "image/jpeg"; // Default to JPEG
    if (ext === ".png") contentType = "image/png";
    if (ext === ".gif") contentType = "image/gif";
    return new NextResponse(fs.readFileSync(filePath), {
      headers: { "Content-Type": contentType },
      status: 200,
    });
  } else {
    return new NextResponse("", {
      headers: { "Content-Type": "image/jpeg" },
      status: 404,
    });
  }
}

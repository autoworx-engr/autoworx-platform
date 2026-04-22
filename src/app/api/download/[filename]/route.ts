import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * @swagger
 * /api/download/{filename}:
 *   get:
 *     summary: Download file by filename
 *     tags: [Download]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File downloaded
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error
 */
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ filename: string }> },
) {
  const params = await props.params;
  try {
    // serverless-safe writable path
    const uploadDir = path.join(os.tmpdir(), "uploads");

    // make sure it exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, params.filename);

    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${params.filename}"`,
        },
      });
    } else {
      return new NextResponse("file not found", { status: 404 });
    }
  } catch (err) {
    return new NextResponse("server error", { status: 500 });
  }
}

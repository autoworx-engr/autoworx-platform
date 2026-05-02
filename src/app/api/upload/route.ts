import { NextRequest, NextResponse } from "next/server";
// import fs from "fs";
// import { pipeline } from "stream";
// import { promisify } from "util";
// import { nanoid } from "nanoid";

// import { isImageFile } from "@/utils/isImageFile";
import { getSignedURL } from "@/actions/s3/signedURL";
import { deleteObject } from "@/actions/s3/deleteObject";
// const pump = promisify(pipeline);

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload files to S3
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *       500:
 *         description: Upload failed
 *   delete:
 *     summary: Delete file from S3
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filePath:
 *                 type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       500:
 *         description: Delete failed
 */
export async function POST(req: NextRequest) {
  try {
    // const fileNames = [];

    // Ensure the uploads directory exists
    // const uploadsDir = path.join(process.cwd(), "images/uploads/");
    // if (!fs.existsSync(uploadsDir)) {
    //   fs.mkdirSync(uploadsDir, { recursive: true });
    // }

    const formData = await req.formData();
    const files = formData.getAll("file") as File[];
    const uploadPromises = files.map(async (file) => {
      const response = await getSignedURL({
        fileType: file.type,
        fileSize: file.size,
        checksum: "", // Optional
        fileName: Math.random().toString(36).substring(2, 15) + "-" + file.name, // Optional
      });

      if (response.error) {
        console.error(response.error);
        return null;
      }

      const { url } = response.success!;

      const upload = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "Content-Length": file.size.toString(),
        },
        body: file,
      });

      if (upload.ok) {
        return url.split("?")[0]; // Return uploaded file URL
      } else {
        console.error("Upload failed for:", file.name);
        return null;
      }
    });

    const fileNames = (await Promise.all(uploadPromises)).filter(Boolean);

    return NextResponse.json({ status: "success", data: fileNames });
  } catch (e) {
    return NextResponse.json({ status: "fail", data: String(e) });
  }
}

// Delete the file
export async function DELETE(req: NextRequest) {
  try {
    const json = await req.json();
    let { filePath } = json;
    // const newPath = path.join(process.cwd(), `images/uploads/${filePath}`);

    // // Ensure the file exists
    // if (fs.existsSync(newPath)) {
    //   fs.unlinkSync(newPath);
    // }
    const res = await deleteObject(filePath);
    if (res?.DeleteMarker) {
      return NextResponse.json({ status: "success" });
    }

    return NextResponse.json({ status: "fail", data: "File not found" });
  } catch (e) {
    return NextResponse.json({ status: "fail", data: e });
  }
}

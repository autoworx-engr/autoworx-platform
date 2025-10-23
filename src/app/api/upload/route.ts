import { NextRequest, NextResponse } from "next/server";
// import fs from "fs";
// import { pipeline } from "stream";
// import { promisify } from "util";
// import { nanoid } from "nanoid";

// import { isImageFile } from "@/utils/isImageFile";
import { getSignedURL } from "@/actions/s3/signedURL";
import { deleteObject } from "@/actions/s3/deleteObject";
// const pump = promisify(pipeline);

export async function POST(req: NextRequest, res: NextResponse) {
  try {
    // const fileNames = [];

    // Ensure the uploads directory exists
    // const uploadsDir = path.join(process.cwd(), "images/uploads/");
    // if (!fs.existsSync(uploadsDir)) {
    //   fs.mkdirSync(uploadsDir, { recursive: true });
    // }

    const formData = await req.formData();
    const files = formData.getAll("file") as File[];
    const uploadPromises = files.map(async file => {
      const response = await getSignedURL({
        fileType: file.type,
        fileSize: file.size,
        checksum: "", // Optional
        fileName: file.name + "-" + Math.random().toString(36).substring(2, 15), // Optional
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
    console.log("🚀 ~ /upload POST ~ e:", e);
    return NextResponse.json({ status: "fail", data: e });
  }
}

// Delete the file
export async function DELETE(req: NextRequest, res: NextResponse) {
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

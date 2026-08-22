import type { Area } from "react-easy-crop";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}

function getRotatedBoundingBox(width: number, height: number, rotRad: number) {
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number,
  outputHeight: number,
  rotation = 0,
  fileName = "cropped.jpg",
): Promise<{ file: File; previewUrl: string }> {
  const image = await createImage(imageSrc);

  // Step 1: draw the full image rotated onto an intermediate canvas
  const rotRad = (rotation * Math.PI) / 180;
  const { width: bboxW, height: bboxH } = getRotatedBoundingBox(
    image.width,
    image.height,
    rotRad,
  );

  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = bboxW;
  rotCanvas.height = bboxH;
  const rotCtx = rotCanvas.getContext("2d")!;

  rotCtx.translate(bboxW / 2, bboxH / 2);
  rotCtx.rotate(rotRad);
  rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

  // Step 2: draw the crop region from the rotated canvas onto the output canvas
  const outCanvas = document.createElement("canvas");
  outCanvas.width = outputWidth;
  outCanvas.height = outputHeight;
  const outCtx = outCanvas.getContext("2d")!;

  outCtx.drawImage(
    rotCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return new Promise((resolve, reject) => {
    outCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas produced an empty blob"));
          return;
        }
        const file = new File([blob], fileName, { type: "image/jpeg" });
        const previewUrl = URL.createObjectURL(blob);
        resolve({ file, previewUrl });
      },
      "image/jpeg",
      0.92,
    );
  });
}

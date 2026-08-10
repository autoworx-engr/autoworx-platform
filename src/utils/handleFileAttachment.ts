// Modified handleFileAttachmentUtils.ts
import { errorToast } from "@/lib/toast";
import imageCompression from "browser-image-compression";
import { ChangeEvent } from "react";

interface HandleAttachmentOptions {
  event: ChangeEvent<HTMLInputElement>;
  setImageUploadIsLoading?: (loading: boolean) => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

// New function to handle file selection without immediate upload
export const handleFileSelection = ({
  event,
  formData,
  setFormData,
}: HandleAttachmentOptions) => {
  const selectedFiles = event.target.files;
  if (!selectedFiles || selectedFiles.length === 0) return;

  // Create local file URLs for preview
  const newAttachments = Array.from(selectedFiles).map((file) => ({
    fileUrl: URL.createObjectURL(file),
    file: file, // Store the actual file for later upload
    id: Date.now() + Math.random(), // Generate a unique ID
    isLocal: true, // Flag to identify locally stored files
  }));

  setFormData((prev: any) => ({
    ...prev,
    attachments: [...(prev.attachments || []), ...newAttachments],
  }));
};

// New function to upload all locally stored files
export const uploadAllAttachments = async (attachments: any[]) => {
  if (!attachments || attachments.length === 0) return [];

  // Filter out files that need to be uploaded (have the isLocal flag)
  const filesToUpload = attachments.filter(
    (attachment) => attachment.isLocal && attachment.file,
  );

  if (filesToUpload.length === 0) {
    // Return existing remote files
    return attachments.map((attachment) => attachment.fileUrl);
  }

  try {
    const imageFormData = new FormData();

    // Compress files before upload
    const compressedFiles = await Promise.all(
      filesToUpload.map((attachment) =>
        imageCompression(attachment.file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        }),
      ),
    );

    // Convert compressed blobs back to File objects with original filenames
    compressedFiles.forEach((compressedFile, index) => {
      const originalFile = filesToUpload[index].file;
      const file = new File([compressedFile], originalFile.name, {
        type: compressedFile.type,
        lastModified: Date.now(),
      });
      imageFormData.append("file", file);
    });

    const res = await fetch("/api/upload", {
      method: "POST",
      body: imageFormData,
    });

    if (!res.ok) {
      errorToast("Failed to upload files");
      throw new Error("Upload failed");
    }

    const result = await res.json();

    if (result.status === "success") {
      const uploadedUrls = result.data;

      // Create a mapping between local files and their uploaded URLs
      const uploadedFiles = filesToUpload.map((attachment, index) => ({
        fileUrl: uploadedUrls[index],
      }));

      // Combine existing remote files with newly uploaded ones
      const finalAttachments = [
        ...attachments
          .filter((attachment) => !attachment.isLocal)
          .map((attachment) => attachment.fileUrl),
        ...uploadedFiles.map((file) => file.fileUrl),
      ];

      return finalAttachments;
    } else {
      throw new Error("Upload response error");
    }
  } catch (error) {
    console.error("Upload error:", error);
    errorToast("Something went wrong while uploading.");
    throw error;
  }
};

// Keep the original function for backward compatibility if needed
export const handleFileAttachmentUtils = async ({
  event,
  setImageUploadIsLoading,
  formData,
  setFormData,
}: HandleAttachmentOptions) => {
  if (setImageUploadIsLoading) setImageUploadIsLoading(true);

  const selectedFiles = event.target.files;
  if (!selectedFiles || selectedFiles.length === 0) return;

  const imageFormData = new FormData();

  try {
    const filesArray = Array.from(selectedFiles);
    const compressedFiles = await Promise.all(
      filesArray.map((file) =>
        imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        }),
      ),
    );

    // Convert compressed blobs back to File objects with original filenames
    compressedFiles.forEach((compressedFile, index) => {
      const originalFile = filesArray[index];
      const file = new File([compressedFile], originalFile.name, {
        type: compressedFile.type,
        lastModified: Date.now(),
      });
      imageFormData.append("file", file);
    });

    const res = await fetch("/api/upload", {
      method: "POST",
      body: imageFormData,
    });

    if (!res.ok) {
      errorToast("Failed to upload files");
      if (setImageUploadIsLoading) setImageUploadIsLoading(false);
      return;
    }

    const result = await res.json();

    if (result.status === "success") {
      const uploadedData = result.data;

      const updatedAttachments = [
        ...(formData.attachments || []),
        ...uploadedData.map((fileUrl: string) => ({ fileUrl })),
      ];

      setFormData((prev: any) => ({
        ...prev,
        attachments: updatedAttachments,
      }));
    }
  } catch (error) {
    console.error("Upload error:", error);
    errorToast("Something went wrong while uploading.");
  } finally {
    if (setImageUploadIsLoading) setImageUploadIsLoading(false);
  }
};

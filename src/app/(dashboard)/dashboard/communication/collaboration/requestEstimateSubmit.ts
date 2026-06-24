import { requestEstimate } from "@/actions/communication/collaboration/requestEstimate";
import imageCompression from "browser-image-compression";

type EstimateInfo = {
  model: string;
  year: string;
  make: string;
  serviceRequest: string;
  dueDate: string;
  notes: string;
};

type SendArgs = {
  photos: File[];
  estimateInfo: EstimateInfo;
  receiverCompanyId: number;
  senderCompanyId: number;
  senderUserId: number;
};

/**
 * Compresses any image photos, creates the estimate request via the server
 * action, then notifies the receiving company in realtime through Pusher.
 * Throws on any failure so the caller can surface the error.
 */
export async function sendRequestEstimate({
  photos,
  estimateInfo,
  receiverCompanyId,
  senderCompanyId,
  senderUserId,
}: SendArgs) {
  const formDataForPhoto = new FormData();

  if (photos.length > 0) {
    const compressedPhotos = await Promise.all(
      photos.map(async (photo) => {
        if (photo.type.startsWith("image/")) {
          return await imageCompression(photo, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });
        }
        return photo;
      }),
    );

    compressedPhotos.forEach((file) => {
      formDataForPhoto.append("file", file);
    });
  }

  const { status, data } = await requestEstimate(formDataForPhoto, {
    ...estimateInfo,
    year: parseInt(estimateInfo.year),
    receiverCompanyId,
    senderCompanyId,
    senderId: senderUserId,
  });

  if (status !== 200) {
    throw new Error("Failed to request estimate");
  }

  const { requestEstimateFromDB } = data;

  const pusherResponse = await fetch("/api/pusher/collaboration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromCompanyId: senderCompanyId,
      senderUserId,
      message: null,
      attachmentFiles: null,
      section: "collaboration",
      toCompanyId: receiverCompanyId,
      attachmentFile: null,
      requestEstimateId: requestEstimateFromDB?.id,
    }),
  });

  const messageData = await pusherResponse.json();

  if (!pusherResponse.ok || !messageData.success) {
    throw new Error("Message wasn't sent");
  }
}

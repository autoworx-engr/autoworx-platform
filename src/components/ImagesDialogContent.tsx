"use client";

import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { TechnicianPhoto } from "./workorder-modal/WorkOrderModalBody";
import { deleteTechnicianImage } from "@/actions/estimate/technician/deleteTechnicianImage";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { errorToast, successToast } from "@/lib/toast";
import { ImagesDialogueShareButtons } from "./workorder-modal/ImagesDialogueShareButtons";
import { ImageContentCard } from "./workorder-modal/ImageContentCard";
import ComponentsLightbox from "@/components/common/LightBox";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useIsAdminOrManager } from "@/utils/useIsAdminOrManager";
import { SelectionToolbar } from "./workorder-modal/SelectionToolbar";
import { sendInfobipEmailWithAttachments } from "@/actions/estimate/invoice/sendInfobipEmail";
import { sendWorkOrderAttachments } from "@/actions/communication/client/chat-track/sendWorkOrderAttachments";

export function ImagesDialogContent({
  technicianPhotos,
  clientId,
  invoiceId,
}: {
  technicianPhotos?: TechnicianPhoto[];
  clientId?: number;
  invoiceId?: string;
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSending, setIsSending] = useState(false);

  const [photosState, setPhotosState] = useState<TechnicianPhoto[]>(
    technicianPhotos || []
  );
  const queryClient = useQueryClient();
  const currentUser = useGetCurrentUser();
  const isAdminOrManager = useIsAdminOrManager();

  useEffect(() => {
    if (technicianPhotos) {
      setPhotosState(technicianPhotos);
      setSelectedIds([]);
    }
  }, [technicianPhotos]);

  const selectableIds = useMemo(
    () => photosState.map((p) => p.id as number),
    [photosState, currentUser?.id, isAdminOrManager]
  );

  const allSelectableSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.includes(id));

  const [lightboxItems, setLightboxItems] = useState<{ src: string }[] | null>(
    null
  );
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  function toggleSelect(id?: number) {
    if (!id) return;
    setSelectedIds((s) =>
      s.includes(id as number)
        ? s.filter((x) => x !== id)
        : [...s, id as number]
    );
  }

  async function handleDelete(id?: number) {
    if (!id) return;

    setSelectedIds((s) => s.filter((x) => x !== id));
    const prev = photosState;
    const img = photosState.find((p) => p.id === id);
    const invoiceId = img?.invoiceId;
    if (currentUser?.id !== img?.technicianId && !isAdminOrManager) return;
    setPhotosState((p) => p.filter((x) => x.id !== id));

    try {
      const result = await deleteTechnicianImage(id);

      if (result?.success) {
        if (invoiceId) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.getWorkOrderDataKey(invoiceId),
          });
        }

        successToast(result?.message || "Photo deleted successfully");
        setSelectedIds((s) => s.filter((x) => x !== id));
      }
    } catch (err) {
      setPhotosState(prev);
      errorToast("Failed to delete photo");
    }
  }

  function generateShareText() {
    const selected = photosState.filter((i) =>
      selectedIds.includes(i.id as number)
    );
    if (selected.length === 0) return "";

    const lines = selected.map((s) => {
      const time = s.timestamp
        ? moment(s.timestamp).format("MMM DD, YYYY hh:mm A")
        : "Unknown time";
      const invoicePart = s.invoiceId ? `Invoice: ${s.invoiceId}\n` : "";
      return `${invoicePart}Uploaded: ${time}\nReported by: ${s.technicianName}\nImage: ${s.photo}`;
    });

    return lines.join("\n\n");
  }
  async function handleEmailShare() {
    if (!clientId) {
      errorToast("Client information not available");
      return;
    }

    const selected = photosState.filter((i) =>
      selectedIds.includes(i.id as number)
    );

    if (selected.length === 0) {
      errorToast("Please select at least one image");
      return;
    }

    setIsSending(true);

    try {
      // Prepare attachment URLs from selected photos
      const attachmentUrls = selected.map((photo) => {
        const fileName =
          photo.photo.split("/").pop() || `technician-photo-${photo.id}.jpg`;
        return {
          url: photo.photo,
          name: fileName,
        };
      });

      // Generate email text content
      const lines = selected.map((s) => {
        const time = s.timestamp
          ? moment(s.timestamp).format("MMM DD, YYYY hh:mm A")
          : "Unknown time";
        const invoicePart = s.invoiceId ? `Invoice: ${s.invoiceId}\n` : "";
        return `${invoicePart}Uploaded: ${time}\nReported by: ${s.technicianName}`;
      });

      const emailText = lines.join("\n\n");
      const subject = `Technician Photos (${selectedIds.length} ${selectedIds.length === 1 ? "image" : "images"})`;

      // Send email with attachments
      const result = await sendInfobipEmailWithAttachments({
        clientId,
        subject,
        text: emailText,
        attachmentUrls,
      });

      if (result.success) {
        successToast(
          `Email sent successfully with ${attachmentUrls.length} ${attachmentUrls.length === 1 ? "attachment" : "attachments"}`
        );
        setSelectedIds([]); // Clear selection after successful send
      } else {
        errorToast(result.message || "Failed to send email");
      }
    } catch (error: any) {
      console.error("Email send error:", error);
      errorToast(error.message || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSmsShare() {
    if (!clientId) {
      errorToast("Client information not available");
      return;
    }

    const selected = photosState.filter((i) =>
      selectedIds.includes(i.id as number)
    );

    if (selected.length === 0) {
      errorToast("Please select at least one image");
      return;
    }

    setIsSending(true);

    try {
      // Prepare attachment URLs from selected photos
      const attachmentUrls = selected.map((photo) => {
        const fileName =
          photo.photo.split("/").pop() || `technician-photo-${photo.id}.jpg`;
        return {
          url: photo.photo,
          name: fileName,
        };
      });

      // Send SMS/MMS with attachments
      const result = await sendWorkOrderAttachments({
        clientId,
        attachments: attachmentUrls,
      });

      if (result.success) {
        successToast(
          `SMS sent successfully with ${attachmentUrls.length} ${attachmentUrls.length === 1 ? "attachment" : "attachments"}`
        );
        setSelectedIds([]); // Clear selection after successful send
      } else {
        errorToast(result.error || "Failed to send SMS");
      }
    } catch (error: any) {
      console.error("SMS send error:", error);
      errorToast(error.message || "Failed to send SMS");
    } finally {
      setIsSending(false);
    }
  }

  async function handleCopyShare() {
    const shareText = generateShareText();
    if (!shareText) return;

    try {
      await navigator.clipboard.writeText(shareText);
      successToast("Copied to clipboard");
    } catch (err) {
      errorToast("Failed to copy to clipboard");
    }
  }

  return (
    <div className="flex flex-col gap-4 ">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border bg-background  md:flex-row md:items-center md:justify-between pb-2 px-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground md:text-2xl">
            Images
          </h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            {photosState.length} {photosState.length === 1 ? "photo" : "photos"}{" "}
            total
          </p>
        </div>

        {selectedIds.length > 0 && (
          <ImagesDialogueShareButtons
            handleCopyShare={handleCopyShare}
            handleEmailShare={handleEmailShare}
            handleSmsShare={handleSmsShare}
          />
        )}
      </div>

      {/* Selection toolbar */}
      <SelectionToolbar
        selectedIds={selectedIds}
        photosState={photosState}
        selectableIds={selectableIds}
        allSelectableSelected={allSelectableSelected}
        setSelectedIds={setSelectedIds}
      />

      {/* Images grid */}
      <div className="mt-1 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {photosState.length === 0 && (
          <p className="col-span-full rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground text-center">
            No images available
          </p>
        )}

        {photosState.map((img, idx) => (
          <ImageContentCard
            key={img.id}
            img={img}
            selectedIds={selectedIds}
            toggleSelect={toggleSelect}
            handleDelete={handleDelete}
            onOpen={() => {
              setLightboxItems(photosState.map((p) => ({ src: p.photo })));
              setLightboxIndex(idx);
            }}
          />
        ))}
        {lightboxItems && (
          <ComponentsLightbox
            getItems={lightboxItems}
            startIndex={lightboxIndex}
            onClose={() => setLightboxItems(null)}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

import moment from "moment";
import { TechnicianPhoto } from "./workorder-modal/WorkOrderModalBody";
import { deleteTechnicianImage } from "@/actions/estimate/technician/deleteTechnicianImage";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { errorToast, successToast } from "@/lib/toast";
import { ImagesDialogueShareButtons } from "./workorder-modal/ImagesDialogueShareButtons";
import { ImageContentCard } from "./workorder-modal/ImageContentCard";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useIsAdminOrManager } from "@/utils/useIsAdminOrManager";

export function ImagesDialogContent({
  technicianPhotos,
}: {
  technicianPhotos?: TechnicianPhoto[];
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // local state so we can optimistically delete
  const [photosState, setPhotosState] = useState<TechnicianPhoto[]>(
    technicianPhotos || []
  );
  const queryClient = useQueryClient();
  const currentUser = useGetCurrentUser();
   const isAdminOrManager = useIsAdminOrManager();
  console.log("currentUser", currentUser);
  useEffect(() => {
    if (technicianPhotos) {
      setPhotosState(technicianPhotos);
    }
  }, [technicianPhotos]);

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
    const shareText = generateShareText();
    if (!shareText) return;

    const subject = encodeURIComponent(
      `Technician Photos (${selectedIds.length} images)`
    );
    const body = encodeURIComponent(shareText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  async function handleSmsShare() {
    const shareText = generateShareText();
    if (!shareText) return;

    const smsBody = encodeURIComponent(shareText);
    window.location.href = `sms:?body=${smsBody}`;
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

  const twilioCredentials = true;
  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-border pb-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground md:text-2xl">
            Images
          </h2>
          <p className="text-xs text-muted-foreground mt-1 md:text-sm">
            {photosState.length} {photosState.length === 1 ? "photo" : "photos"}{" "}
            total
          </p>
        </div>

        {selectedIds.length > 0 && (
          <ImagesDialogueShareButtons
            handleCopyShare={handleCopyShare}
            handleEmailShare={handleEmailShare}
            handleSmsShare={handleSmsShare}
            twilioCredentials={twilioCredentials}
          />
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {photosState.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">
            No images available
          </p>
        )}

        {photosState.map((img) => (
          <ImageContentCard
            img={img}
            selectedIds={selectedIds}
            toggleSelect={toggleSelect}
            handleDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { DialogClose } from "@/components/Dialog";
import { useEffect, useState } from "react";
import { Check, Share2, Square, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import moment from "moment";
import { TechnicianPhoto } from "./workorder-modal/WorkOrderModalBody";
import { deleteTechnicianImage } from "@/actions/estimate/technician/deleteTechnicianImage";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { errorToast, successToast } from "@/lib/toast";

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

  async function handleShareSelected() {
    const selected = photosState.filter((i) =>
      selectedIds.includes(i.id as number)
    );
    if (selected.length === 0) return;

    const lines = selected.map((s) => {
      const time = s.timestamp
        ? moment(s.timestamp).format("MMM DD, YYYY hh:mm A")
        : "Unknown time";
      const invoicePart = s.invoiceId ? `Invoice: ${s.invoiceId}\n` : "";
      return `${invoicePart}Uploaded: ${time}\nReported by: ${s.technicianName}\nImage: ${s.photo}`;
    });

    const shareText = lines.join("\n\n");

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch (err) {
        // user cancelled or failed
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied image info and links to clipboard");
    } catch (err) {
      toast.error("Unable to copy image info");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold">Images</h3>
        {selectedIds.length > 0 && (
          <button
            onClick={handleShareSelected}
            className="flex items-center gap-2 rounded bg-green-600 px-3 py-1 text-sm text-white"
          >
            <Share2 className="h-4 w-4" /> Share ({selectedIds.length})
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {photosState.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">
            No images available
          </p>
        )}

        {photosState.map((img) => (
          <div key={img.id} className="relative rounded border p-2 shadow-sm">
            <div className="h-40 w-full overflow-hidden rounded relative">
              <Image
                src={img.photo}
                alt={`photo-${img.id}`}
                width={800}
                height={400}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <button
                  onClick={() => toggleSelect(img.id as number)}
                  className={`flex items-center gap-1 rounded text-sm px-0.5 py-0.5 transition-all ${selectedIds.includes(img.id as number) ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"}`}
                >
                  {selectedIds.includes(img.id as number) ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>

                <button
                  onClick={() => handleDelete(img.id as number)}
                  className="flex items-center gap-1 rounded bg-red-500 px-2 py-1 text-sm text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold">
                  Reported By: {img.technicianName}
                </p>
                <p className="text-muted-foreground">
                  {moment(img.timestamp).format("MMM DD, YYYY hh:mm A")}
                </p>
                {img.invoiceId && (
                  <p className="text-muted-foreground">
                    Invoice: {img.invoiceId}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

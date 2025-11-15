"use client";

import Image from "next/image";
import { DialogClose } from "@/components/Dialog";
import { useState } from "react";
import { Check, Share2, Square, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import moment from "moment";

export interface InvoicePhoto {
  id: number;
  photo: string;
  technicianName: string;
  timestamp: string;
}

const photos = [
  {
    id: 1,
    photo: "https://ik.imagekit.io/monzilkit/modern-car-driving-city.jpg",
    technicianName: "John Doe",
    timestamp: "2023-10-01T10:00:00Z",
  },
  {
    id: 2,
    photo: "https://ik.imagekit.io/monzilkit/modern-car-driving-city.jpg",
    technicianName: "Jane Smith",
    timestamp: "2023-10-02T14:30:00Z",
  },
  {
    id: 3,
    photo: "https://ik.imagekit.io/monzilkit/modern-car-driving-city.jpg",
    technicianName: "Mike Johnson",
    timestamp: "2023-10-01T10:00:00Z",
  },
  {
    id: 4,
    photo: "https://ik.imagekit.io/monzilkit/modern-car-driving-city.jpg",
    technicianName: "Emily Davis",
    timestamp: "2023-10-02T14:30:00Z",
  },
];

export function ImagesDialogContent() {
  const [images, setImages] = useState<InvoicePhoto[]>(photos || []);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  function toggleSelect(id?: number) {
    if (!id) return;
    setSelectedIds((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  async function handleDelete(id?: number) {
    if (!id) return;
    // optimistic UI: remove locally then call server
    setImages((x) => x.filter((p) => p.id !== id));

    try {
      const res = await fetch(`/api/invoice/photo/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Photo deleted");
    } catch (err) {
      toast.error("Failed to delete photo");
      // revert (simple refetch would be better)
      setImages(photos || []);
    }
  }

  async function handleShareSelected() {
    const selected = images.filter((i) => selectedIds.includes(i.id));
    if (selected.length === 0) return;

    const links = selected.map((s) => s.photo).join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ text: links });
        // toast.success("Shared selected images");
      } catch (err) {
        // user cancelled or failed
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(links);
      toast.success("Copied image links to clipboard");
    } catch (err) {
      toast.error("Unable to copy links");
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
        {images.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">
            No images available
          </p>
        )}

        {images.map((img) => (
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
                  onClick={() => toggleSelect(img.id)}
                  className={`flex items-center gap-1 rounded text-sm px-0.5 py-0.5 transition-all ${selectedIds.includes(img.id) ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"}`}
                >
                  {selectedIds.includes(img.id) ? (
                    <>
                      <Check className="h-5 w-5" />
                    </>
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>

                <button
                  onClick={() => handleDelete(img.id)}
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

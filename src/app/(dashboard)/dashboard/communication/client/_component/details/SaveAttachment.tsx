"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  File,
  Mic,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { isAudio, isImage } from "../../_utils";

type Attachment = {
  id: number;
  name: string | null;
  url: string;
};

type TProps = {
  attachment: Attachment;
  allAttachments?: Attachment[];
  variant?: "chip" | "thumbnail";
};

export default function SaveAttachment({
  attachment,
  allAttachments = [],
  variant = "chip",
}: TProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  const effectiveList =
    allAttachments.length > 0 ? allAttachments : [attachment];

  const openModal = () => {
    const idx = effectiveList.findIndex((a) => a.id === attachment.id);
    setCurrentIndex(idx >= 0 ? idx : 0);
    setZoom(1);
    setIsOpen(true);
  };

  const closeModal = () => setIsOpen(false);

  const goPrev = useCallback(() => {
    setCurrentIndex(
      (i) => (i - 1 + effectiveList.length) % effectiveList.length,
    );
    setZoom(1);
  }, [effectiveList.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % effectiveList.length);
    setZoom(1);
  }, [effectiveList.length]);

  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 1));

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, goPrev, goNext]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const currentAttachment = effectiveList[currentIndex];
  const isCurrentImage = isImage(currentAttachment?.name ?? "");

  return (
    <>
      {variant === "thumbnail" ? (
        <button
          onClick={openModal}
          className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:opacity-90 transition-opacity"
        >
          {isImage(attachment.name ?? "") ? (
            <Image
              src={attachment.url}
              alt={attachment.name ?? ""}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1">
              <File className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
              <span className="text-[9px] uppercase font-medium text-zinc-400 dark:text-zinc-500">
                {attachment.name?.split(".").pop() ?? "file"}
              </span>
            </div>
          )}
        </button>
      ) : (
        /* Attachment Button */
        <button
          onClick={openModal}
          className="flex cursor-pointer items-center gap-x-2 rounded-md border border-emerald-600 px-2 py-1 text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        >
          {isAudio(attachment.name ?? "") ? (
            <Mic className="h-5 w-5 shrink-0" />
          ) : (
            <File className="h-5 w-5 shrink-0" />
          )}
          <span>
            {(attachment.name?.length ?? 0) > 15
              ? attachment.name!.slice(0, 15) + "..."
              : (attachment.name ?? "")}
          </span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          {/* Top Controls */}
          <div className="absolute right-4 top-4 flex items-center gap-2">
            {isCurrentImage && (
              <>
                <button
                  onClick={zoomOut}
                  className="rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>

                <button
                  onClick={zoomIn}
                  className="rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
              </>
            )}

            <button
              onClick={closeModal}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Counter */}
          {effectiveList.length > 1 && (
            <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
              {currentIndex + 1} / {effectiveList.length}
            </span>
          )}

          {/* Prev */}
          {effectiveList.length > 1 && (
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/25"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Content */}
          <div className="flex flex-col items-center justify-center gap-3">
            {isCurrentImage ? (
              <div
                className="flex items-center justify-center overflow-auto"
                style={{
                  maxHeight: "90vh",
                  maxWidth: "90vw",
                }}
              >
                <Image
                  src={currentAttachment.url}
                  alt={currentAttachment.name ?? "attachment"}
                  width={1400}
                  height={1000}
                  unoptimized
                  className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center",
                    transition: "transform 0.2s ease",
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/10 px-10 py-10 text-white">
                <File className="h-16 w-16 opacity-80" />

                <p className="max-w-[260px] break-all text-center text-sm font-medium">
                  {currentAttachment.name}
                </p>

                <a
                  href={currentAttachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            )}
          </div>

          {/* Next */}
          {effectiveList.length > 1 && (
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/25"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Dot indicators */}
          {effectiveList.length > 1 && effectiveList.length <= 12 && (
            <div className="absolute bottom-5 flex gap-1.5">
              {effectiveList.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentIndex(i);
                    setZoom(1);
                  }}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i === currentIndex
                      ? "scale-125 bg-white"
                      : "bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

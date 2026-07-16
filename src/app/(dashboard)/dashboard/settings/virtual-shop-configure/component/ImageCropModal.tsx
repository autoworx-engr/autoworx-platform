"use client";

import { getCroppedImg } from "@/utils/getCroppedImg";
import { Loader2, RotateCcw, X, ZoomIn } from "lucide-react";
import React, { useCallback, useState } from "react";
import type { Area, Point } from "react-easy-crop";
import Cropper from "react-easy-crop";

export type ImageCropModalProps = {
  open: boolean;
  image: string;
  aspect: number;
  cropShape?: "rect" | "round";
  outputWidth?: number;
  outputHeight?: number;
  fileName?: string;
  onClose: () => void;
  onComplete: (file: File, previewUrl: string) => void;
};

export function ImageCropModal({
  open,
  image,
  aspect,
  cropShape = "rect",
  outputWidth = 800,
  outputHeight,
  fileName = "cropped.jpg",
  onClose,
  onComplete,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const resolvedHeight = outputHeight ?? Math.round(outputWidth / aspect);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const resetState = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDone = async () => {
    if (!croppedAreaPixels) return;
    setIsCropping(true);
    try {
      const result = await getCroppedImg(
        image,
        croppedAreaPixels,
        outputWidth,
        resolvedHeight,
        rotation,
        fileName,
      );
      onComplete(result.file, result.previewUrl);
      resetState();
    } finally {
      setIsCropping(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Crop Image</h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Crop canvas */}
        <div className="relative h-64 shrink-0 bg-slate-900 sm:h-80">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={cropShape}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle: {
                border: "2px solid #6571FF",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              },
            }}
          />
        </div>

        {/* Controls */}
        <div className="shrink-0 space-y-4 px-5 py-4">
          <SliderControl
            icon={<ZoomIn className="h-3.5 w-3.5" />}
            label="Zoom"
            value={zoom}
            min={1}
            max={3}
            step={0.05}
            display={`${zoom.toFixed(1)}×`}
            onChange={setZoom}
          />
          <SliderControl
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            label="Rotate"
            value={rotation}
            min={-180}
            max={180}
            step={1}
            display={`${rotation}°`}
            onChange={setRotation}
          />
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
          <button
            onClick={handleClose}
            disabled={isCropping}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            disabled={isCropping}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCropping ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cropping…
              </>
            ) : (
              "Done"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── internal slider ────────────────────────────────────────────────────────

type SliderControlProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
};

function SliderControl({
  icon,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: SliderControlProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          {icon}
          {label}
        </label>
        <span className="text-xs text-slate-400">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-primary"
      />
    </div>
  );
}

"use client";

import { slimInputClassName } from "@/components/SlimInput";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import { Info, UploadCloud, X } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

export type ServiceInfoState = {
  serviceTitle: string;
  description: string;
  customDuration: string;
  imageName: string;
  imageUrl: string;
  vehicleTypeModifiers: {
    coupe: string;
    sedan: string;
    suv: string;
    truck: string;
  };
};

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "link"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

const QUILL_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "link",
  "color",
  "background",
  "list",
  "bullet",
];

const VEHICLE_TYPES: Array<{
  key: keyof ServiceInfoState["vehicleTypeModifiers"];
  label: string;
}> = [
  { key: "coupe", label: "Coupe" },
  { key: "sedan", label: "Sedan" },
  { key: "suv", label: "SUV" },
  { key: "truck", label: "Truck" },
];

const getInitialCounterFromDuration = (durationValue: string) => {
  const totalMinutes = Number.parseInt(durationValue, 10);

  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return { hours: 0, minutes: 0 };
  }

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
};

const normalizeCounterValue = (nextValue: number) => {
  if (!Number.isFinite(nextValue) || nextValue < 0) {
    return 0;
  }

  return Math.floor(nextValue);
};

const counterToDurationMinutes = (hours: number, minutes: number) => {
  const safeHours = normalizeCounterValue(hours);
  const safeMinutes = Math.min(59, normalizeCounterValue(minutes));

  return safeHours * 60 + safeMinutes;
};

const toCounterInputValue = (value: number) => (value > 0 ? String(value) : "");

type ServiceInfoProps = {
  value: ServiceInfoState;
  onChange: Dispatch<SetStateAction<ServiceInfoState>>;
  onImageSelect: (file: File | null) => void;
  errors?: {
    serviceTitle?: string;
    description?: string;
  };
};

export default function ServiceInfo({
  value,
  onChange,
  onImageSelect,
  errors,
}: ServiceInfoProps) {
  const {
    serviceTitle,
    description,
    customDuration,
    imageName,
    imageUrl,
    vehicleTypeModifiers,
  } = value;

  const shouldShowExistingImage = Boolean(imageUrl && !imageName);
  const initialCounter = useMemo(
    () => getInitialCounterFromDuration(customDuration),
    [customDuration],
  );
  const [durationHoursInput, setDurationHoursInput] = useState(
    toCounterInputValue(initialCounter.hours),
  );
  const [durationMinutesInput, setDurationMinutesInput] = useState(
    toCounterInputValue(initialCounter.minutes),
  );
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const incomingDuration = Number.parseInt(customDuration, 10);
    const normalizedIncomingDuration =
      Number.isFinite(incomingDuration) && incomingDuration > 0
        ? incomingDuration
        : 0;

    const parsedHours = durationHoursInput.trim()
      ? normalizeCounterValue(Number(durationHoursInput))
      : 0;
    const parsedMinutes = durationMinutesInput.trim()
      ? Math.min(59, normalizeCounterValue(Number(durationMinutesInput)))
      : 0;

    const durationFromCounter = counterToDurationMinutes(
      parsedHours,
      parsedMinutes,
    );

    if (durationFromCounter === normalizedIncomingDuration) {
      return;
    }

    setDurationHoursInput(toCounterInputValue(initialCounter.hours));
    setDurationMinutesInput(toCounterInputValue(initialCounter.minutes));
  }, [
    customDuration,
    durationHoursInput,
    durationMinutesInput,
    initialCounter.hours,
    initialCounter.minutes,
  ]);

  const setVehicleTypeModifiers = (
    updater: (
      prev: ServiceInfoState["vehicleTypeModifiers"],
    ) => ServiceInfoState["vehicleTypeModifiers"],
  ) => {
    onChange((prev) => ({
      ...prev,
      vehicleTypeModifiers: updater(prev.vehicleTypeModifiers),
    }));
  };

  const handleImageChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    const file = event.target.files?.[0] || null;
    onChange((prev) => ({
      ...prev,
      imageName: file?.name || "",
    }));
    onImageSelect(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0] || null;
    if (file && ["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      onChange((prev) => ({ ...prev, imageName: file.name || "" }));
      onImageSelect(file);
    }
  };

  const handleClearImage = () => {
    onChange((prev) => ({ ...prev, imageName: "", imageUrl: "" }));
    onImageSelect(null);
  };

  const handleDurationCounterChange = (
    nextHoursInput: string,
    nextMinutesInput: string,
  ) => {
    if (
      nextHoursInput !== "" &&
      (!/^\d+$/.test(nextHoursInput) || nextHoursInput.length > 2)
    ) {
      return;
    }

    if (
      nextMinutesInput !== "" &&
      (!/^\d+$/.test(nextMinutesInput) || nextMinutesInput.length > 2)
    ) {
      return;
    }

    const safeHours = nextHoursInput.trim()
      ? normalizeCounterValue(Number(nextHoursInput))
      : 0;
    const safeMinutes = nextMinutesInput.trim()
      ? Math.min(59, normalizeCounterValue(Number(nextMinutesInput)))
      : 0;
    const totalMinutes = counterToDurationMinutes(safeHours, safeMinutes);

    setDurationHoursInput(
      nextHoursInput.trim() && safeHours !== Number(nextHoursInput)
        ? String(safeHours)
        : nextHoursInput,
    );
    setDurationMinutesInput(
      nextMinutesInput.trim() && safeMinutes !== Number(nextMinutesInput)
        ? String(safeMinutes)
        : nextMinutesInput,
    );

    onChange((prev) => ({
      ...prev,
      customDuration: totalMinutes > 0 ? String(totalMinutes) : "",
    }));
  };

  const hasImage = Boolean(imageName || imageUrl);
  const displayImageName = imageName || (imageUrl ? "Current image" : "");

  return (
    <div className="w-full space-y-5 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      {/* ── Row 1: Title + Duration ────────────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Service Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Service Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={serviceTitle}
            onChange={(event) =>
              onChange((prev) => ({
                ...prev,
                serviceTitle: event.target.value,
              }))
            }
            placeholder="e.g. Full Engine Overhaul"
            className={cn(
              "w-full rounded-lg border px-3.5 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all duration-200",
              "placeholder:text-slate-400",
              "focus:border-[#6571FF]/50 focus:ring-2 focus:ring-[#6571FF]/15 focus:shadow-sm",
              errors?.serviceTitle
                ? "border-rose-400 bg-rose-50/40 focus:border-rose-400 focus:ring-rose-400/15"
                : "border-slate-200 bg-slate-50/60 hover:border-slate-300",
              slimInputClassName,
            )}
          />
          {errors?.serviceTitle && (
            <p className="flex items-center gap-1 text-xs text-rose-500">
              <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
              {errors.serviceTitle}
            </p>
          )}
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Duration
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center text-slate-400 transition-colors hover:text-[#6571FF]"
                  aria-label="Duration information"
                >
                  <Info size={12} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs leading-relaxed">
                Set hours and minutes. It will be automatically converted to
                total minutes for saving.
              </TooltipContent>
            </Tooltip>
          </label>

          <div className="flex items-center gap-2">
            {/* Hours */}
            <div className="relative flex-1">
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={durationHoursInput}
                onKeyDown={(event) => {
                  if (["e", "E", "+", "-", "."].includes(event.key)) {
                    event.preventDefault();
                  }
                }}
                onChange={(event) =>
                  handleDurationCounterChange(
                    event.target.value,
                    durationMinutesInput,
                  )
                }
                placeholder="00"
                className={cn(
                  "w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-center text-sm font-bold text-slate-700 outline-none transition-all duration-200",
                  "hover:border-slate-300 focus:border-[#6571FF]/50 focus:ring-2 focus:ring-[#6571FF]/15",
                  slimInputClassName,
                )}
              />
              <span className="pointer-events-none absolute bottom-0 left-0 right-0 text-center text-[10px] font-medium text-slate-400">
                HH
              </span>
            </div>

            <span className="text-xl font-bold text-[#6571FF]">:</span>

            {/* Minutes */}
            <div className="relative flex-1">
              <input
                type="number"
                min={0}
                max={59}
                step={1}
                inputMode="numeric"
                value={durationMinutesInput}
                onKeyDown={(event) => {
                  if (["e", "E", "+", "-", "."].includes(event.key)) {
                    event.preventDefault();
                  }
                }}
                onChange={(event) =>
                  handleDurationCounterChange(
                    durationHoursInput,
                    event.target.value,
                  )
                }
                placeholder="00"
                className={cn(
                  "w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-center text-sm font-bold text-slate-700 outline-none transition-all duration-200",
                  "hover:border-slate-300 focus:border-[#6571FF]/50 focus:ring-2 focus:ring-[#6571FF]/15",
                  slimInputClassName,
                )}
              />
              <span className="pointer-events-none absolute bottom-0 left-0 right-0 text-center text-[10px] font-medium text-slate-400">
                MM
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Description ───────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Description <span className="text-rose-500">*</span>
        </label>
        <div
          className={cn(
            "rounded-lg border overflow-hidden",
            errors?.description ? "border-rose-400" : "border-slate-200",
          )}
        >
          <ReactQuill
            theme="snow"
            value={description}
            onChange={(value) =>
              onChange((prev) => ({ ...prev, description: value }))
            }
            placeholder="Describe the service in detail — what it includes, how long it takes, and what customers can expect…"
            modules={QUILL_MODULES}
            formats={QUILL_FORMATS}
            style={{ minHeight: "200px" }}
          />
        </div>
        {errors?.description && (
          <p className="flex items-center gap-1 text-xs text-rose-500">
            <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
            {errors.description}
          </p>
        )}
      </div>

      {/* ── Service Image ─────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Service Image
        </label>

        {hasImage ? (
          <div className="flex items-center gap-3 rounded-lg border border-[#6571FF]/25 bg-[#6571FF]/5 px-4 py-3">
            <div className="flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 shadow-sm">
              {shouldShowExistingImage ? (
                <img
                  src={imageUrl}
                  alt="Current service image"
                  className="h-24 w-28 object-cover"
                />
              ) : (
                <div className="flex h-24 w-28 items-center justify-center bg-slate-100">
                  <UploadCloud size={24} className="text-slate-400" />
                </div>
              )}
            </div>

            {/* File info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-700">
                {displayImageName}
              </p>
              <p className="text-xs text-slate-400">PNG · JPG · WEBP</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <label
                className="cursor-pointer rounded-md border border-[#6571FF]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#6571FF] transition-all hover:bg-[#6571FF]/5 hover:border-[#6571FF]/50"
                title="Change image"
              >
                Change
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
              <button
                type="button"
                onClick={handleClearImage}
                className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-all duration-200",
              isDragOver
                ? "border-[#6571FF] bg-[#6571FF]/8 scale-[0.995]"
                : "border-slate-200 bg-slate-50/60 hover:border-[#6571FF]/40 hover:bg-[#6571FF]/3",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200",
                isDragOver
                  ? "bg-[#6571FF]/15 text-[#6571FF]"
                  : "bg-slate-100 text-slate-400",
              )}
            >
              <UploadCloud size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600">
                {isDragOver ? "Drop to upload" : "Click or drag image here"}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                PNG, JPG, WEBP • Recommended 800×600px
              </p>
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
        )}
      </div>

      {/* ── Vehicle Type Price Modifiers ──────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Vehicle Type Price Modifiers
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {VEHICLE_TYPES.map((vehicleType) => {
            const modVal =
              vehicleTypeModifiers[
                vehicleType.key as keyof typeof vehicleTypeModifiers
              ];
            const isEmpty = !modVal || modVal === "0";

            return (
              <div
                key={vehicleType.key}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-white transition-all duration-200",
                  "hover:border-[#6571FF]/30 hover:shadow-sm",
                  !isEmpty
                    ? "border-[#6571FF]/25 shadow-sm ring-1 ring-[#6571FF]/10"
                    : "border-slate-200",
                )}
              >
                <div className="px-3 pb-3 pt-2.5">
                  {/* Vehicle label row */}
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-500">
                      {vehicleType.label}
                    </span>
                  </div>

                  {/* Dollar prefix input */}
                  <div className="relative">
                    <span
                      className={cn(
                        "absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold transition-colors",
                        !isEmpty ? "text-[#6571FF]" : "text-slate-400",
                      )}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      inputMode="decimal"
                      value={modVal === "0" ? "" : modVal}
                      onKeyDown={(event) => {
                        if (["e", "E", "+", "-"].includes(event.key)) {
                          event.preventDefault();
                        }
                      }}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        if (
                          nextValue === "" ||
                          /^\d*\.?\d{0,2}$/.test(nextValue)
                        ) {
                          setVehicleTypeModifiers((prev) => ({
                            ...prev,
                            [vehicleType.key]: nextValue,
                          }));
                        }
                      }}
                      className={cn(
                        "w-full rounded-lg border py-1.5 pl-7 pr-3 text-sm font-bold outline-none transition-all duration-200",
                        "placeholder:font-normal placeholder:text-slate-300",
                        !isEmpty
                          ? "border-[#6571FF]/25 bg-[#6571FF]/5 text-[#6571FF] focus:border-[#6571FF]/50 focus:ring-2 focus:ring-[#6571FF]/15"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 focus:border-[#6571FF]/40 focus:ring-2 focus:ring-[#6571FF]/10",
                        slimInputClassName,
                      )}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400">
          Extra charge added on top of the base service price for each vehicle
          type.
        </p>
      </div>
    </div>
  );
}

"use client";

import { slimInputClassName } from "@/components/SlimInput";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

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

  const handleDurationCounterChange = (
    nextHoursInput: string,
    nextMinutesInput: string,
  ) => {
    if (nextHoursInput !== "" && !/^\d+$/.test(nextHoursInput)) {
      return;
    }

    if (nextMinutesInput !== "" && !/^\d+$/.test(nextMinutesInput)) {
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

  return (
    <div className="h-full w-full space-y-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            Service Title <span className="text-red-500">*</span>
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
            placeholder="Enter service title"
            className={cn(
              "w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-slate-400",
              errors?.serviceTitle ? "border-red-500" : "border-slate-300",
              slimInputClassName,
            )}
          />
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mt-1">
            Duration
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center text-slate-400 transition-colors hover:text-slate-600"
                  aria-label="Duration information"
                >
                  <Info size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs leading-relaxed">
                Set hours and minutes. It will be automatically converted to
                total minutes for saving.
              </TooltipContent>
            </Tooltip>
          </label>
          <div className="flex items-center gap-2">
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
              placeholder="HH"
              className={cn(
                "w-20 rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-semibold outline-none focus:border-[#6571FF] focus:ring-2 focus:ring-[#6571FF]/20",
                slimInputClassName,
              )}
            />
            <span className="text-lg font-bold text-slate-500">:</span>
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
              placeholder="MM"
              className={cn(
                "w-20 rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-semibold outline-none focus:border-[#6571FF] focus:ring-2 focus:ring-[#6571FF]/20",
                slimInputClassName,
              )}
            />
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(event) =>
            onChange((prev) => ({ ...prev, description: event.target.value }))
          }
          placeholder="Enter service description"
          rows={4}
          className={cn(
            "w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus:border-slate-400",
            errors?.description ? "border-red-500" : "border-slate-300",
            slimInputClassName,
          )}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">
          Service Image
        </label>
        <div className="flex items-center gap-3">
          {shouldShowExistingImage && (
            <img
              src={imageUrl}
              alt="Current service image"
              className="h-12 w-14 rounded-md border border-slate-200 object-cover"
            />
          )}

          <label className="flex w-full cursor-pointer items-center justify-between rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <span className="truncate">
              {imageName || "Choose image (PNG, JPG, WEBP)"}
            </span>
            <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">
              Browse
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">
          Vehicle Type Price Modifiers (+$)
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { key: "coupe", label: "Coupe" },
            { key: "sedan", label: "Sedan" },
            { key: "suv", label: "SUV" },
            { key: "truck", label: "Truck" },
          ].map((vehicleType) => (
            <div key={vehicleType.key} className="space-y-1">
              <label className="text-xs text-slate-500">
                {vehicleType.label}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                inputMode="decimal"
                value={
                  vehicleTypeModifiers[
                    vehicleType.key as keyof typeof vehicleTypeModifiers
                  ] === "0"
                    ? ""
                    : vehicleTypeModifiers[
                        vehicleType.key as keyof typeof vehicleTypeModifiers
                      ]
                }
                onKeyDown={(event) => {
                  if (["e", "E", "+", "-"].includes(event.key)) {
                    event.preventDefault();
                  }
                }}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  if (nextValue === "" || /^\d*\.?\d{0,2}$/.test(nextValue)) {
                    setVehicleTypeModifiers((prev) => ({
                      ...prev,
                      [vehicleType.key]: nextValue,
                    }));
                  }
                }}
                className={cn(
                  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400",
                  slimInputClassName,
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

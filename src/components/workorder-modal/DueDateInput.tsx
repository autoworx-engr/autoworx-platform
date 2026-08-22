"use client";
import { isIosPwa } from "@/utils/isIosPwa";
import React, { useEffect, useRef, useState } from "react";

type TProps = {
  dueDate: string | null;
  setDueDate: React.Dispatch<React.SetStateAction<string | null>>;
};

export default function DueDate({ dueDate, setDueDate }: TProps) {
  const [showInput, setShowInput] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isPwa = isIosPwa();
  const [useOverlay, setUseOverlay] = useState(false);



  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setDueDate(date);
  };



  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInput(true);
    }, 0.1);

    return () => clearTimeout(timer);
  }, []);

  // Enable the manual overlay placeholder only when running as a PWA/standalone
  // (iOS PWA via `isPwa()` helper or Android/other via display-mode standalone).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isDisplayStandalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      // @ts-ignore navigator.standalone is used by iOS
      (navigator && (navigator as any).standalone === true);

    setUseOverlay(Boolean(isPwa || isDisplayStandalone));
  }, [isPwa]);

  return (
    <div className="mt-1">
      {showInput && (
        <>
          <label className="flex flex-col md:items-start md:text-base">
            <span className="mb-1 font-medium">Due Date</span>
            <div className="relative">
              <input
                ref={inputRef}
                name="dueDate"
                type="date"
                value={dueDate ?? ""}
                onChange={handleDateChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="mm/dd/yyyy"
                className="
              md:w-full
              rounded-lg
              border
              border-slate-300
              bg-white
              px-4
              py-2
              text-sm
              shadow-sm
              transition
              focus:border-indigo-500
              focus:ring-2
              focus:ring-indigo-200
              focus:outline-none
            "
                autoFocus={false}
              />
              {/* Custom overlay placeholder: native mobile date pickers ignore the placeholder attribute, so show an absolutely positioned label when empty and unfocused */}
              {!dueDate && !focused && useOverlay && (
                <span className="absolute md:hidden inset-y-0 left-2 flex items-center text-slate-400 select-none pointer-events-none" aria-hidden>
                  mm/dd/yyyy
                </span>
              )}
            </div>
          </label>
        </>
      )}
    </div>
  );
}

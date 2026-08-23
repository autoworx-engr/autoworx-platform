"use client";

import { Download, MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SPEEDS = [0.5, 1, 1.5, 2];

// Download row + "Speed" label + one row per speed, plus the menu's own padding.
const MENU_HEIGHT = 190;

type Props = {
  downloadUrl: string;
  fileName: string;
  rate: number;
  onRateChange: (rate: number) => void;
  tone?: "light" | "dark";
};

export default function AudioOptionsMenu({
  downloadUrl,
  fileName,
  rate,
  onRateChange,
  tone = "dark",
}: Props) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // The player lives inside a scrolling call list, so a menu that always
  // opens downward is unreachable for the calls near the bottom.
  const toggleOpen = () => {
    setOpen((isOpen) => {
      if (isOpen) return false;
      const rect = menuRef.current?.getBoundingClientRect();
      if (rect) setDropUp(window.innerHeight - rect.bottom < MENU_HEIGHT);
      return true;
    });
  };

  return (
    <div className="relative flex-shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Recording options"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          tone === "light"
            ? "text-white/70 hover:bg-white/20 hover:text-white"
            : "text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
        }`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-50 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg ${
            dropUp ? "bottom-8" : "top-8"
          }`}
        >
          <a
            href={downloadUrl}
            download={fileName}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>

          <div className="mt-1 border-t border-slate-100 px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Speed
          </div>
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              role="menuitemradio"
              aria-checked={rate === speed}
              onClick={() => {
                onRateChange(speed);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-50 ${
                rate === speed ? "font-semibold text-primary" : "text-slate-700"
              }`}
            >
              {speed}×{rate === speed && <span aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

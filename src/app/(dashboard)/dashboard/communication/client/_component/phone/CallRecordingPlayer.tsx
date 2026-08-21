"use client";

import { formatAudioTime, useAudioPlayer } from "@/hooks/useAudioPlayer";
import { Download, MoreVertical, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SPEEDS = [0.5, 1, 1.5, 2];

type Props = {
  src: string;
  /** Call length from Twilio, used until the media reports a finite duration. */
  fallbackDuration?: number | null;
  fileName?: string;
};

/**
 * Player for a call recording.
 *
 * Replaces the native `<audio controls>`: Chrome drove its progress bar off the
 * streamed MP3's duration estimate, so the bar jumped backwards as the estimate
 * grew, and it dropped its own overflow menu whenever the control strip was too
 * short or narrow — hence the download/speed menu showing on some rows only.
 * Here the bar is computed from the known call duration and the menu is ours.
 */
export default function CallRecordingPlayer({
  src,
  fallbackDuration,
  fileName,
}: Props) {
  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    progress,
    rate,
    toggle,
    seekToRatio,
    changeRate,
  } = useAudioPlayer(fallbackDuration);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  const downloadUrl = src.includes("?")
    ? `${src}&download=1`
    : `${src}?download=1`;

  return (
    <div className="flex items-center gap-2.5">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? "Pause recording" : "Play recording"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm transition-all hover:bg-[#5563E8] active:scale-95"
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
        ) : (
          <Play
            className="h-3.5 w-3.5 translate-x-[1px]"
            fill="currentColor"
            strokeWidth={0}
          />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            seekToRatio((event.clientX - rect.left) / rect.width);
          }}
          onKeyDown={(event) => {
            if (!duration) return;
            if (event.key === "ArrowRight")
              seekToRatio((currentTime + 5) / duration);
            if (event.key === "ArrowLeft")
              seekToRatio((currentTime - 5) / duration);
          }}
          className="group/seek flex h-3 cursor-pointer items-center"
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-medium leading-none text-slate-500">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{duration ? formatAudioTime(duration) : "--:--"}</span>
        </div>
      </div>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Recording options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            <a
              href={downloadUrl}
              download={fileName ?? "call-recording.mp3"}
              onClick={() => setMenuOpen(false)}
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
                  changeRate(speed);
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-50 ${
                  rate === speed
                    ? "font-semibold text-primary"
                    : "text-slate-700"
                }`}
              >
                {speed}×{rate === speed && <span aria-hidden>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { formatAudioTime, useAudioPlayer } from "@/hooks/useAudioPlayer";
import { Mic, Pause, Phone, Play } from "lucide-react";
import React from "react";
import AudioOptionsMenu from "./AudioOptionsMenu";

// Decorative waveform bar heights (percent of container height)
const WAVE_HEIGHTS = [
  30, 55, 75, 45, 85, 60, 95, 50, 40, 70, 80, 55, 65, 40, 75, 90, 50, 45, 60,
  80, 95, 60, 50, 38, 70, 88, 55, 42, 58, 78,
];

type PlayerVariant = "voice-note" | "recording";

// "recording" sits inside a container that already has its own background
// (the call bubble), so it stays transparent and fills the available width.
const getTheme = (variant: PlayerVariant, isOutgoing: boolean) => {
  if (variant === "recording") {
    return {
      wrapper: "w-full bg-transparent text-slate-800",
      button: "bg-[#067E89] hover:bg-[#05666f] text-white",
      barFilled: "#067E89",
      barEmpty: "#cbd5e1",
      time: "text-slate-500",
      badge: "text-slate-300",
      rateChip: "bg-[#067E89]/10 text-[#067E89]",
      menuTone: "dark" as const,
    };
  }
  return {
    wrapper: isOutgoing
      ? "min-w-[210px] max-w-[280px] bg-gradient-to-br from-[#0a8a95] to-[#006D77] text-white shadow-sm"
      : "min-w-[210px] max-w-[280px] bg-white border border-gray-100 shadow-sm text-zinc-800",
    button: isOutgoing
      ? "bg-white/25 hover:bg-white/40 text-white"
      : "bg-[#006D77] hover:bg-[#005a63] text-white",
    barFilled: isOutgoing ? "rgba(255,255,255,0.92)" : "#006D77",
    barEmpty: isOutgoing ? "rgba(255,255,255,0.28)" : "#d1d5db",
    time: isOutgoing ? "text-white/60" : "text-zinc-400",
    badge: isOutgoing ? "text-white/40" : "text-zinc-300",
    rateChip: isOutgoing
      ? "bg-white/25 text-white"
      : "bg-[#006D77]/10 text-[#006D77]",
    menuTone: (isOutgoing ? "light" : "dark") as "light" | "dark",
  };
};

interface VoiceNotePlayerProps {
  src: string;
  isOutgoing: boolean;
  variant?: PlayerVariant;
  registerAudio?: (el: HTMLAudioElement | null) => void;
  onPlay?: () => void;
  fallbackDuration?: number | null;
  downloadUrl?: string;
  fileName?: string;
}

export default function VoiceNotePlayer({
  src,
  isOutgoing,
  variant = "voice-note",
  registerAudio,
  onPlay,
  fallbackDuration,
  downloadUrl,
  fileName,
}: VoiceNotePlayerProps) {
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

  const handleToggle = () => {
    if (audioRef.current?.paused) onPlay?.();
    toggle();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekToRatio((e.clientX - rect.left) / rect.width);
  };

  const theme = getTheme(variant, isOutgoing);
  const BadgeIcon = variant === "recording" ? Phone : Mic;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 ${theme.wrapper}`}
    >
      <audio
        ref={(el) => {
          audioRef.current = el;
          registerAudio?.(el);
        }}
        src={src}
        preload="metadata"
      />

      {/* Play / Pause button */}
      <button
        onClick={handleToggle}
        className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95 shadow-sm ${theme.button}`}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" fill="currentColor" strokeWidth={0} />
        ) : (
          <Play
            className="w-4 h-4 translate-x-[1px]"
            fill="currentColor"
            strokeWidth={0}
          />
        )}
      </button>

      {/* Waveform + time */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {/* Waveform bars — click to seek */}
        <div
          className="relative flex items-center h-8 cursor-pointer select-none"
          onClick={handleSeek}
          title="Seek"
        >
          <div className="flex items-center gap-[2px] w-full h-full">
            {WAVE_HEIGHTS.map((h, i) => {
              const barThreshold = (i / WAVE_HEIGHTS.length) * 100;
              const filled = barThreshold <= progress;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-colors duration-75"
                  style={{
                    height: `${h}%`,
                    backgroundColor: filled ? theme.barFilled : theme.barEmpty,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Timestamps */}
        <div
          className={`flex items-center text-[10px] leading-none font-medium ${theme.time}`}
        >
          <span>{formatAudioTime(currentTime)}</span>
          {duration > 0 && (
            <>
              <span className="mx-0.5 opacity-50">/</span>
              <span>{formatAudioTime(duration)}</span>
            </>
          )}
          {rate !== 1 && (
            <span
              className={`ml-1.5 rounded-full px-1.5 py-[2px] text-[9px] font-semibold leading-none ${theme.rateChip}`}
              title={`Playing at ${rate}× speed`}
            >
              {rate}×
            </span>
          )}
        </div>
      </div>

      {downloadUrl ? (
        <AudioOptionsMenu
          downloadUrl={downloadUrl}
          fileName={fileName ?? "recording.mp3"}
          rate={rate}
          onRateChange={changeRate}
          tone={theme.menuTone}
        />
      ) : (
        /* Source badge */
        <BadgeIcon className={`w-3.5 h-3.5 flex-shrink-0 ${theme.badge}`} />
      )}
    </div>
  );
}

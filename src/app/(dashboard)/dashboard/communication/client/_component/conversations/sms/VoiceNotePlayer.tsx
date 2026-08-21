"use client";

import { formatAudioTime, useAudioPlayer } from "@/hooks/useAudioPlayer";
import { Mic, Pause, Play } from "lucide-react";
import React from "react";

// Decorative waveform bar heights (percent of container height)
const WAVE_HEIGHTS = [
  30, 55, 75, 45, 85, 60, 95, 50, 40, 70, 80, 55, 65, 40, 75, 90, 50, 45, 60,
  80, 95, 60, 50, 38, 70, 88, 55, 42, 58, 78,
];

interface VoiceNotePlayerProps {
  src: string;
  isOutgoing: boolean;
}

export default function VoiceNotePlayer({
  src,
  isOutgoing,
}: VoiceNotePlayerProps) {
  // Shared with the call recording player: keeps the bar from running backwards
  // when a streamed clip revises its duration estimate mid-playback.
  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    progress,
    toggle,
    seekToRatio,
  } = useAudioPlayer();

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekToRatio((e.clientX - rect.left) / rect.width);
  };

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 min-w-[210px] max-w-[280px] ${
        isOutgoing
          ? // Voice notes render without a wrapping bubble (SmsMessage.tsx only
            // applies its teal bubble when there's text), so this needs its own
            // real background rather than a translucent tint meant to sit on
            // top of that bubble.
            "bg-gradient-to-br from-[#0a8a95] to-[#006D77] text-white shadow-sm"
          : "bg-white border border-gray-100 shadow-sm text-zinc-800"
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause button */}
      <button
        onClick={toggle}
        className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95 shadow-sm ${
          isOutgoing
            ? "bg-white/25 hover:bg-white/40 text-white"
            : "bg-[#006D77] hover:bg-[#005a63] text-white"
        }`}
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
                    backgroundColor: isOutgoing
                      ? filled
                        ? "rgba(255,255,255,0.92)"
                        : "rgba(255,255,255,0.28)"
                      : filled
                        ? "#006D77"
                        : "#d1d5db",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Timestamps */}
        <div
          className={`flex items-center text-[10px] leading-none font-medium ${
            isOutgoing ? "text-white/60" : "text-zinc-400"
          }`}
        >
          <span>{formatAudioTime(currentTime)}</span>
          {duration > 0 && (
            <>
              <span className="mx-0.5 opacity-50">/</span>
              <span>{formatAudioTime(duration)}</span>
            </>
          )}
        </div>
      </div>

      {/* Mic badge */}
      <Mic
        className={`w-3.5 h-3.5 flex-shrink-0 ${
          isOutgoing ? "text-white/40" : "text-zinc-300"
        }`}
      />
    </div>
  );
}

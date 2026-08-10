"use client";

import { Mic, Pause, Play } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onDurationChange = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    audio.currentTime = ratio * duration;
  };

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 min-w-[210px] max-w-[280px] ${
        isOutgoing
          ? "bg-white/10 text-white"
          : "bg-white border border-gray-100 shadow-sm text-zinc-800"
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause button */}
      <button
        onClick={togglePlay}
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
          <span>{formatTime(currentTime)}</span>
          {duration > 0 && (
            <>
              <span className="mx-0.5 opacity-50">/</span>
              <span>{formatTime(duration)}</span>
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

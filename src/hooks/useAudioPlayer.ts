"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Playback state for a single `<audio>` element.
 *
 * Duration is only accepted once it is finite. A streamed MP3 reports
 * `Infinity` (and then a growing estimate) until enough of it has been
 * buffered, so a progress bar computed straight off `audio.duration` shrinks as
 * the estimate rises — the "bar moves backwards" effect. `fallbackDuration`
 * (the call's recorded length, for instance) keeps the bar honest until the real
 * value lands.
 */
export function useAudioPlayer(fallbackDuration?: number | null) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [rate, setRate] = useState(1);

  const fallback =
    fallbackDuration &&
    Number.isFinite(fallbackDuration) &&
    fallbackDuration > 0
      ? fallbackDuration
      : 0;
  const duration = mediaDuration || fallback;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const readDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setMediaDuration(audio.duration);
      }
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", readDuration);
    audio.addEventListener("durationchange", readDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", readDuration);
      audio.removeEventListener("durationchange", readDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, []);

  /** Seek to a 0–1 position of the track. */
  const seekToRatio = useCallback(
    (ratio: number) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      audio.currentTime = Math.max(0, Math.min(1, ratio)) * duration;
      setCurrentTime(audio.currentTime);
    },
    [duration],
  );

  const changeRate = useCallback((next: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = next;
    setRate(next);
  }, []);

  // Never exceeds 100%: a stale duration estimate would otherwise let the bar
  // overshoot and snap back.
  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    progress,
    rate,
    toggle,
    seekToRatio,
    changeRate,
  };
}

/** m:ss, tolerant of NaN/Infinity from a media element. */
export function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

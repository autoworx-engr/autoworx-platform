"use client";

import { MISSED_STATUSES, isCallStale } from "@/lib/twilio/callDisplay";
import moment from "moment";
import { useEffect, useRef } from "react";
import VoiceNotePlayer from "../conversations/sms/VoiceNotePlayer";
import { useCallListRefresh } from "./useCallListRefresh";

export type CallListItem = {
  id: number;
  direction: string | null;
  status: string | null;
  duration: number | null;
  from: string;
  to: string;
  createdAt: string | Date;
  playableUrl: string | null;
};

const MISSED_LABELS: Record<string, string> = {
  "no-answer": "Missed call",
  busy: "Missed call — line busy",
  failed: "Call failed",
  canceled: "Call canceled",
};

export const CallList = ({
  data,
  clientId,
}: {
  data: CallListItem[];
  clientId: number;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  useCallListRefresh(clientId);

  // Only one recording plays at a time
  const pauseOtherRecordings = (playingCallId: number) => {
    audioRefs.current.forEach((audio, id) => {
      if (id !== playingCallId && !audio.paused) {
        audio.pause();
      }
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data]);

  // e.g., "5/13/2025, 2:45:10 PM"
  const formatDateTime = (date: string | Date) =>
    moment(date).format("MM/DD/YYYY, h:mm:ss A");

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div
      ref={scrollRef}
      className="mb-4 flex h-full w-full flex-col space-y-3 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
    >
      {data.map((call) => {
        const isSentByMe = call.direction === "outbound";
        const status = call.status ?? "";

        const isStale = isCallStale(status, call.createdAt);
        const isMissed = MISSED_STATUSES.has(status) || isStale;

        const missedLabel =
          status === "no-answer" && isSentByMe
            ? "No answer"
            : (MISSED_LABELS[status] ?? "Missed call");
        const isInProgress =
          !isStale && (status === "in-progress" || status === "ringing");

        return (
          <div
            key={call.id}
            className={`flex ${isSentByMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`group w-[85%] rounded-xl p-3 shadow-sm transition-all duration-300 hover:shadow-md ${
                isSentByMe
                  ? "rounded-br-none bg-gradient-to-br from-[#067E89]/10 to-[#067E89]/5 ring-1 ring-[#067E89]/20 text-slate-800 hover:ring-[#067E89]/30"
                  : "rounded-bl-none bg-white ring-1 ring-slate-200 text-slate-800 hover:ring-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-700">
                  {isSentByMe ? (
                    <span className="inline-flex items-center gap-1">
                      <svg
                        className="h-3.5 w-3.5 text-[#067E89]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                      You
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <svg
                        className="h-3.5 w-3.5 text-emerald-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 17l-5-5m0 0l5-5m-5 5h12"
                        />
                      </svg>
                      Client
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {isSentByMe ? call.to : call.from}
                </p>
              </div>

              <p className="mb-2 text-xs text-slate-500 flex items-center gap-1">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {formatDateTime(call.createdAt)}
              </p>

              {isMissed ? (
                <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-600 ring-1 ring-rose-200">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 8l4-4m0 0h-4m4 0v4M3 5a2 2 0 012-2h1.6a1 1 0 01.98.8l.7 3.4a1 1 0 01-.27.92l-1.2 1.2a12 12 0 005.87 5.87l1.2-1.2a1 1 0 01.92-.27l3.4.7a1 1 0 01.8.98V17a2 2 0 01-2 2h-1A13 13 0 013 6V5z"
                    />
                  </svg>
                  {missedLabel}
                </div>
              ) : call.playableUrl ? (
                <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/50 ring-1 ring-slate-900/5 transition-all duration-300 group-hover:ring-slate-900/10">
                  <VoiceNotePlayer
                    src={call.playableUrl}
                    isOutgoing={isSentByMe}
                    variant="recording"
                    fallbackDuration={call.duration}
                    downloadUrl={`${call.playableUrl}${call.playableUrl.includes("?") ? "&" : "?"}download=1`}
                    fileName={`call-${call.id}.mp3`}
                    registerAudio={(el) => {
                      if (el) {
                        audioRefs.current.set(call.id, el);
                      } else {
                        audioRefs.current.delete(call.id);
                      }
                    }}
                    onPlay={() => pauseOtherRecordings(call.id)}
                  />
                </div>
              ) : isInProgress ? (
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  {status === "ringing" ? "Ringing…" : "In progress…"}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-500 ring-1 ring-slate-200">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {call.duration
                    ? `Completed — ${formatDuration(call.duration)}`
                    : "No recording available"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

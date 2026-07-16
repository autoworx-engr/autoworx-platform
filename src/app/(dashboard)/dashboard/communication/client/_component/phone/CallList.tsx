"use client";

import { useEffect, useRef } from "react";

export type CallListItem = {
  id: number;
  direction: string | null;
  from: string;
  to: string;
  createdAt: string | Date;
  playableUrl: string | null;
};

export const CallList = ({ data }: { data: CallListItem[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data]);

  const formatDateTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleString(); // e.g., "5/13/2025, 2:45:10 PM"
  };

  return (
    <div
      ref={scrollRef}
      className="mb-4 flex h-full w-full flex-col space-y-3 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
    >
      {data.map((call) => {
        const isSentByMe = call.direction === "outbound";

        return (
          <div
            key={call.id}
            className={`flex ${isSentByMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`group w-[85%] rounded-xl p-3 shadow-sm transition-all duration-300 hover:shadow-md ${
                isSentByMe
                  ? "rounded-br-none bg-gradient-to-br from-primary/10 to-[#5563E8]/10 ring-1 ring-primary/20 text-slate-800 hover:ring-primary/30"
                  : "rounded-bl-none bg-white ring-1 ring-slate-200 text-slate-800 hover:ring-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-700">
                  {isSentByMe ? (
                    <span className="inline-flex items-center gap-1">
                      <svg
                        className="h-3.5 w-3.5 text-primary"
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

              {call.playableUrl ? (
                <div className="overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/50 p-2 ring-1 ring-slate-900/5 transition-all duration-300 group-hover:ring-slate-900/10">
                  <audio
                    controls
                    src={call.playableUrl}
                    className="w-full h-8"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 rounded-lg px-2 py-1.5 ring-1 ring-rose-200">
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  No recording available
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

"use client";

import { useEffect, useRef } from "react";

export const CallList = ({
  data,
  twilioNumber,
}: {
  data: any[];
  twilioNumber: string;
}) => {
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
      className="mb-4 flex h-full w-full flex-col space-y-4 overflow-y-auto px-2"
    >
      {data.map((call) => {
        const isSentByMe = call.from === twilioNumber;

        return (
          <div
            key={call.id}
            className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`w-[85%] rounded-lg p-3 shadow-md ${
                isSentByMe
                  ? "rounded-br-none bg-purple-200 text-black"
                  : "rounded-bl-none border bg-white text-gray-800"
              }`}
            >
              <p className="mb-1 text-sm font-semibold">
                {isSentByMe ? "You →" : "← Client"}{" "}
                {isSentByMe ? call.to : call.from}
              </p>

              <p className="mb-1 text-xs text-gray-500">
                📆 {formatDateTime(call.createdAt)}
              </p>

              {call.playableUrl ? (
                <div className="overflow-hidden rounded bg-white p-2 shadow-inner">
                  <audio controls src={call.playableUrl} className="w-full" />
                </div>
              ) : (
                <p className="text-sm text-red-500">No recording available</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React from "react";

type TProps = {
  callStatus: string;
  callDuration: number;
};

export default function CallStatus({ callStatus, callDuration }: TProps) {
  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };
  return (
    <div className="mt-4 w-full rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 text-center shadow-sm ring-1 ring-slate-900/5 transition-all duration-300">
      <p className="text-sm font-medium text-slate-600">
        Status:{" "}
        <span className="font-semibold text-slate-800">{callStatus}</span>
      </p>
      {callStatus === "Call connected" && (
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 ring-1 ring-slate-900/5">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <p className="text-lg font-mono font-bold text-slate-600">
            {formatDuration(callDuration)}
          </p>
        </div>
      )}
    </div>
  );
}

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
    <div className="mt-6 w-full rounded-lg bg-purple-100 p-4 text-center shadow">
      <p className="font-medium text-purple-800">
        Status: <span className="font-bold">{callStatus}</span>
      </p>
      {callStatus === "Call connected" && (
        <p className="mt-2 text-lg font-semibold text-purple-900">
          Duration: {formatDuration(callDuration)}
        </p>
      )}
    </div>
  );
}

"use client";
import { CopilotMessageUI } from "@/stores/copilotStore";

type Props = {
  message: CopilotMessageUI;
};

export default function CopilotMessageCard({ message }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[80%] rounded-xl bg-[#006D77] px-3 py-2 text-sm text-white shadow-md">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 px-4 py-1">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#006D77] text-white text-xs font-bold">
        AI
      </div>
      <div className="max-w-[85%] rounded-xl bg-white px-3 py-2 text-sm text-gray-800 shadow-md border border-gray-100 whitespace-pre-wrap">
        {message.content}
        {message.streaming && (
          <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-gray-400 align-middle" />
        )}
      </div>
    </div>
  );
}

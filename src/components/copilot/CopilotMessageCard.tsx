"use client";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { CopilotMessageUI } from "@/stores/copilotStore";

type Props = {
  message: CopilotMessageUI;
};

const markdownComponents: Components = {
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#006D77] underline underline-offset-2 hover:opacity-80"
      >
        {children}
      </a>
    );
  },
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
      <div className="max-w-[85%] rounded-xl bg-white px-3 py-2 text-sm text-gray-800 shadow-md border border-gray-100 prose prose-sm max-w-none">
        <ReactMarkdown components={markdownComponents}>
          {message.content}
        </ReactMarkdown>
        {message.streaming && (
          <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-gray-400 align-middle" />
        )}
      </div>
    </div>
  );
}

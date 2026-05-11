"use client";
import { useEffect, useRef } from "react";
import { CopilotMessageUI } from "@/stores/copilotStore";
import CopilotMessageCard from "./CopilotMessageCard";
import CopilotThinkingIndicator from "./CopilotThinkingIndicator";

type Props = {
  messages: CopilotMessageUI[];
  isStreaming: boolean;
};

export default function CopilotMessageList({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const showThinking =
    isStreaming &&
    (messages.length === 0 || messages[messages.length - 1]?.role === "user");

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-gray-400">
        <p className="text-sm">Ask me anything about AutoWorx.</p>
        <p className="text-xs">
          Manage leads, estimates, appointments, and more.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto py-2">
      {messages.map((msg) => (
        <CopilotMessageCard key={msg.id} message={msg} />
      ))}
      {showThinking && <CopilotThinkingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}

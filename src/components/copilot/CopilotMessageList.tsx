"use client";
import { useEffect, useRef } from "react";
import { CopilotMessageUI, ActiveToolCall } from "@/stores/copilotStore";
import CopilotMessageCard from "./CopilotMessageCard";
import CopilotThinkingIndicator from "./CopilotThinkingIndicator";
import CopilotToolPills from "./CopilotToolPills";

type Props = {
  messages: CopilotMessageUI[];
  isStreaming: boolean;
  activeToolCalls?: ActiveToolCall[];
};

export default function CopilotMessageList({
  messages,
  isStreaming,
  activeToolCalls = [],
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, activeToolCalls]);

  const showThinking =
    isStreaming &&
    activeToolCalls.length === 0 &&
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
      {isStreaming && activeToolCalls.length > 0 && (
        <CopilotToolPills toolCalls={activeToolCalls} />
      )}
      {showThinking && <CopilotThinkingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}

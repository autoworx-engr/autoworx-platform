"use client";
import { Bot, History, Plus, X } from "lucide-react";
import { SheetClose } from "@/components/ui/sheet";

type Props = {
  showHistory: boolean;
  onToggleHistory: () => void;
  onNewChat: () => void;
};

export default function CopilotChatHeader({
  showHistory,
  onToggleHistory,
  onNewChat,
}: Props) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#006D77] text-white">
          <Bot size={14} />
        </div>
        <span className="text-sm font-semibold text-gray-800">AI Copilot</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onNewChat}
          title="New conversation"
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          onClick={onToggleHistory}
          title={showHistory ? "Back to chat" : "View history"}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            showHistory
              ? "bg-[#006D77]/10 text-[#006D77]"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <History size={15} />
        </button>
        <SheetClose asChild>
          <button
            type="button"
            title="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X size={15} />
          </button>
        </SheetClose>
      </div>
    </div>
  );
}

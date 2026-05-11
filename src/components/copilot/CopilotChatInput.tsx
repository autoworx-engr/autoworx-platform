"use client";
import { useRef, KeyboardEvent } from "react";
import { SendHorizonal } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

export default function CopilotChatInput({
  value,
  onChange,
  onSend,
  disabled,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!disabled && value.trim()) onSend();
    }
    // Shift+Enter falls through to default (newline)
  };

  return (
    <div className="flex items-end gap-2 border-t border-gray-100 bg-white px-3 py-3">
      <textarea
        ref={textareaRef}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#006D77] focus:ring-0 transition-colors"
        style={{ maxHeight: 120, overflowY: "auto" }}
        placeholder="Ask something… (⌘+Enter to send)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={onSend}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#006D77] text-white transition-opacity disabled:opacity-40"
        aria-label="Send"
      >
        <SendHorizonal size={16} />
      </button>
    </div>
  );
}

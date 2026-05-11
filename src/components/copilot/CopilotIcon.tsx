"use client";
import { Bot } from "lucide-react";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useCopilotStore } from "@/stores/copilotStore";
import CopilotPanel from "./CopilotPanel";

export default function CopilotIcon() {
  const currentUser = useGetCurrentUser();
  const { setOpen } = useCopilotStore();

  if (!(currentUser as any)?.hasCopilot) return null;

  return (
    <>
      <CopilotPanel />
      <button
        type="button"
        title="AI Copilot"
        onClick={() => setOpen(true)}
        className="group relative flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-[#006D77] transition-colors"
      >
        <Bot size={20} />
        <span className="invisible absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg group-hover:visible">
          AI Copilot
        </span>
      </button>
    </>
  );
}

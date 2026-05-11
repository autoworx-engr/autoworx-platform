"use client";
import { create } from "zustand";

export type CopilotMessageRole = "user" | "assistant";

export type CopilotMessageUI = {
  id: string;
  role: CopilotMessageRole;
  content: string;
  streaming?: boolean;
};

type CopilotStore = {
  isOpen: boolean;
  sessionId: string | null;
  messages: CopilotMessageUI[];
  isStreaming: boolean;

  setOpen: (open: boolean) => void;
  setSessionId: (id: string | null) => void;
  addMessage: (msg: CopilotMessageUI) => void;
  appendToken: (token: string) => void;
  setStreaming: (streaming: boolean) => void;
  reset: () => void;
};

export const useCopilotStore = create<CopilotStore>((set) => ({
  isOpen: false,
  sessionId: null,
  messages: [],
  isStreaming: false,

  setOpen: (open) => set({ isOpen: open }),
  setSessionId: (id) => set({ sessionId: id }),

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  appendToken: (token) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.streaming) {
        msgs[msgs.length - 1] = { ...last, content: last.content + token };
        return { messages: msgs };
      }
      // Start a new streaming assistant message
      const streamingMsg: CopilotMessageUI = {
        id: `stream-${Date.now()}`,
        role: "assistant",
        content: token,
        streaming: true,
      };
      return { messages: [...msgs, streamingMsg] };
    }),

  setStreaming: (streaming) =>
    set((state) => {
      if (!streaming) {
        // Mark last streaming message as done
        const msgs = state.messages.map((m) =>
          m.streaming ? { ...m, streaming: false } : m,
        );
        return { isStreaming: false, messages: msgs };
      }
      return { isStreaming: true };
    }),

  reset: () => set({ sessionId: null, messages: [], isStreaming: false }),
}));

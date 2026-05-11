"use client";
import { create } from "zustand";

export type CopilotMessageRole = "user" | "assistant";

export type CopilotMessageUI = {
  id: string;
  role: CopilotMessageRole;
  content: string;
  streaming?: boolean;
};

export type ActiveToolCall = {
  toolName: string;
  done: boolean;
  isError: boolean;
};

type CopilotStore = {
  isOpen: boolean;
  sessionId: string | null;
  messages: CopilotMessageUI[];
  isStreaming: boolean;
  activeToolCalls: ActiveToolCall[];

  setOpen: (open: boolean) => void;
  setSessionId: (id: string | null) => void;
  addMessage: (msg: CopilotMessageUI) => void;
  appendToken: (token: string) => void;
  setStreaming: (streaming: boolean) => void;
  addToolCall: (toolName: string) => void;
  resolveToolCall: (toolName: string, isError: boolean) => void;
  reset: () => void;
};

export const useCopilotStore = create<CopilotStore>((set) => ({
  isOpen: false,
  sessionId: null,
  messages: [],
  isStreaming: false,
  activeToolCalls: [],

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
        const msgs = state.messages.map((m) =>
          m.streaming ? { ...m, streaming: false } : m,
        );
        return { isStreaming: false, messages: msgs, activeToolCalls: [] };
      }
      return { isStreaming: true };
    }),

  addToolCall: (toolName) =>
    set((state) => ({
      activeToolCalls: [
        ...state.activeToolCalls,
        { toolName, done: false, isError: false },
      ],
    })),

  resolveToolCall: (toolName, isError) =>
    set((state) => {
      const calls = [...state.activeToolCalls];
      const idx = calls.findLastIndex(
        (c) => c.toolName === toolName && !c.done,
      );
      if (idx !== -1) {
        calls[idx] = { ...calls[idx], done: true, isError };
      }
      return { activeToolCalls: calls };
    }),

  reset: () =>
    set({
      sessionId: null,
      messages: [],
      isStreaming: false,
      activeToolCalls: [],
    }),
}));

"use client";
import { useState, useCallback } from "react";
import { flushSync } from "react-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCopilotStore } from "@/stores/copilotStore";
import CopilotChatHeader from "./CopilotChatHeader";
import CopilotMessageList from "./CopilotMessageList";
import CopilotChatInput from "./CopilotChatInput";
import CopilotConversationList from "./CopilotConversationList";

async function loadSession(
  sessionId: string,
  onMessages: (msgs: { id: number; role: string; content: string }[]) => void,
) {
  const res = await fetch(`/api/copilot/sessions/${sessionId}`);
  if (!res.ok) return;
  const data = await res.json();
  onMessages(data.session?.messages ?? []);
}

export default function CopilotPanel() {
  const {
    isOpen,
    sessionId,
    messages,
    isStreaming,
    setOpen,
    setSessionId,
    addMessage,
    appendToken,
    setStreaming,
    reset,
  } = useCopilotStore();

  const [inputValue, setInputValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const closeSession = useCallback(async (sid: string) => {
    try {
      await fetch(`/api/copilot/sessions/${sid}/close`, { method: "POST" });
    } catch {}
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open && sessionId) {
      closeSession(sessionId);
    }
    setOpen(open);
    if (!open) setShowHistory(false);
  };

  const handleNewChat = () => {
    if (sessionId) closeSession(sessionId);
    reset();
    setShowHistory(false);
  };

  const handleSelectSession = async (sid: string) => {
    if (sessionId && sid !== sessionId) closeSession(sessionId);
    reset();
    setSessionId(sid);
    setShowHistory(false);
    await loadSession(sid, (msgs) => {
      msgs.forEach((m, i) =>
        addMessage({
          id: `loaded-${m.id}-${i}`,
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        }),
      );
    });
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    setInputValue("");
    addMessage({ id: `user-${Date.now()}`, role: "user", content: text });
    setStreaming(true);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });

      if (!res.ok || !res.body) {
        appendToken("Sorry, something went wrong. Please try again.");
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "text_delta") {
              flushSync(() => appendToken(event.text));
            } else if (event.type === "done") {
              if (event.sessionId && !sessionId) {
                setSessionId(event.sessionId);
              }
            } else if (event.type === "error") {
              appendToken(`\n\n[Error: ${event.message}]`);
            }
          } catch {}
        }
      }
    } catch {
      appendToken("Connection error. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[420px] flex-col p-0 sm:max-w-[420px]"
      >
        <CopilotChatHeader
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory((v) => !v)}
          onNewChat={handleNewChat}
        />

        {showHistory ? (
          <div className="flex-1 overflow-y-auto">
            <CopilotConversationList
              onSelect={handleSelectSession}
              currentSessionId={sessionId}
            />
          </div>
        ) : (
          <>
            <CopilotMessageList messages={messages} isStreaming={isStreaming} />
            <CopilotChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              disabled={isStreaming}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

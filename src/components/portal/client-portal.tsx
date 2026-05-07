"use client";

import { cn } from "@/lib/utils";
import Pusher from "pusher-js";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ClientMessage = {
  id: number;
  senderType: "AGENT" | "CLIENT";
  senderName: string;
  content: string;
  createdAt: string;
};

type Props = {
  token: string;
  title: string;
  accountName: string;
  defaultSenderName: string;
  pusherKey: string;
  pusherCluster: string;
};

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function ClientPortal({
  token,
  title,
  accountName,
  defaultSenderName,
  pusherKey,
  pusherCluster,
}: Props) {
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [input, setInput] = useState("");
  const [senderName, setSenderName] = useState(defaultSenderName);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);

  /* ── Pusher ── */
  useEffect(() => {
    const p = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: "/api/pusher/public-auth",
    });
    pusherRef.current = p;
    const ch = p.subscribe(`private-client-${token}`);
    ch.bind("new-message", (msg: ClientMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return () => {
      p.unsubscribe(`private-client-${token}`);
      p.disconnect();
    };
  }, [token, pusherKey, pusherCluster]);

  /* ── Load history ── */
  useEffect(() => {
    void fetch(`/api/client-chat/messages?token=${token}`)
      .then((r) => r.json())
      .then((data: { messages: ClientMessage[] }) => {
        setMessages(data.messages ?? []);
        setLoading(false);
      });
  }, [token]);

  /* ── Scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`/api/client-chat/messages?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, senderName }),
      });
      const msg: ClientMessage = await res.json();
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  /* ── Name gate ── */
  if (!nameConfirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white text-lg font-bold">
              {accountName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{title}</p>
              <p className="text-xs text-slate-500">{accountName}</p>
            </div>
          </div>
          <p className="mb-4 text-sm text-slate-600">
            Welcome! Enter your name so the team knows who they&apos;re speaking with.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (senderName.trim()) setNameConfirmed(true);
            }}
            className="space-y-3"
          >
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              required
              placeholder="Your name"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              Open chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-teal-50 to-slate-100">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white font-bold">
          {accountName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{accountName}</p>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-lg space-y-3">
          {loading ? (
            <p className="text-center text-sm text-slate-400">Loading…</p>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-400">No messages yet.</p>
              <p className="mt-1 text-xs text-slate-400">Send a message to get started.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isClient = msg.senderType === "CLIENT";
              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col", isClient ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      isClient
                        ? "rounded-br-sm bg-teal-600 text-white"
                        : "rounded-bl-sm bg-white text-slate-900 shadow-sm border border-slate-100",
                    )}
                  >
                    {msg.content}
                  </div>
                  <span className="mt-1 text-[10px] text-slate-400">
                    {msg.senderName} · {fmtTime(msg.createdAt)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="border-t border-slate-200 bg-white px-4 py-3">
        <form onSubmit={send} className="mx-auto flex max-w-lg items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
              input.trim() && !sending
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "bg-slate-200 text-slate-400 cursor-not-allowed",
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-slate-400">
          Powered by AWX Platform
        </p>
      </footer>
    </div>
  );
}

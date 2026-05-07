"use client";

import { cn } from "@/lib/utils";
import Pusher from "pusher-js";
import { Check, Copy, ExternalLink, Plus, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

type AccountOption = { id: number; name: string };
type ContactOption = { id: number; firstName: string; lastName: string | null };

type Conversation = {
  id: number;
  token: string;
  title: string | null;
  accountId: number;
  account: { id: number; name: string };
  contact: { id: number; firstName: string; lastName: string | null } | null;
  messages: ClientMessage[];
};

type ClientMessage = {
  id: number;
  senderType: "AGENT" | "CLIENT";
  senderName: string;
  content: string;
  createdAt: string;
};

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

type Props = {
  accounts: AccountOption[];
  contacts: ContactOption[];
  pusherKey: string;
  pusherCluster: string;
  siteUrl: string;
};

export function ClientChatHub({ accounts, contacts, pusherKey, pusherCluster, siteUrl }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAccountId, setNewAccountId] = useState("");
  const [newContactId, setNewContactId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);

  /* ── Init Pusher ── */
  useEffect(() => {
    const p = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: "/api/pusher/auth",
    });
    pusherRef.current = p;
    return () => p.disconnect();
  }, [pusherKey, pusherCluster]);

  /* ── Load conversations ── */
  useEffect(() => {
    void fetch("/api/client-chat/conversations")
      .then((r) => r.json())
      .then((data: Conversation[]) => {
        setConversations(data);
        if (data.length > 0 && !active) setActive(data[0]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Subscribe to active conversation channel ── */
  useEffect(() => {
    if (!active || !pusherRef.current) return;
    const channel = pusherRef.current.subscribe(`private-client-${active.token}`);
    channel.bind("new-message", (msg: ClientMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return () => pusherRef.current?.unsubscribe(`private-client-${active.token}`);
  }, [active]);

  /* ── Load message history ── */
  useEffect(() => {
    if (!active) return;
    void fetch(`/api/client-chat/messages?token=${active.token}`)
      .then((r) => r.json())
      .then((data: { messages: ClientMessage[] }) => setMessages(data.messages ?? []));
  }, [active]);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send message ── */
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !active || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`/api/client-chat/messages?token=${active.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const msg: ClientMessage = await res.json();
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } catch {
      toast.error("Failed to send");
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  /* ── Create conversation ── */
  async function createConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccountId || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/client-chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: Number(newAccountId),
          contactId: newContactId ? Number(newContactId) : undefined,
          title: newTitle || undefined,
        }),
      });
      const conv: Conversation = await res.json();
      setConversations((prev) => [conv, ...prev]);
      setActive(conv);
      setShowNew(false);
      setNewAccountId("");
      setNewContactId("");
      setNewTitle("");
    } catch {
      toast.error("Could not create conversation");
    } finally {
      setCreating(false);
    }
  }

  /* ── Copy portal link ── */
  function copyLink(token: string) {
    void navigator.clipboard.writeText(`${siteUrl}/portal/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const portalUrl = active ? `${siteUrl}/portal/${active.token}` : "";

  return (
    <div className="flex flex-1 overflow-hidden rounded-xl border border-border shadow-sm">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-muted/40">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Client Chats
          </p>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            title="New conversation"
            className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 text-muted-foreground hover:bg-teal-50 hover:text-teal-700"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground/60">
              No conversations yet.
              <br />
              <button
                type="button"
                onClick={() => setShowNew(true)}
                className="mt-1 text-teal-600 underline"
              >
                Create one
              </button>
            </li>
          )}
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setActive(c)}
                className={cn(
                  "flex w-full flex-col px-4 py-3 text-left transition-colors",
                  active?.id === c.id
                    ? "bg-teal-50 text-teal-900"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                <span className="truncate text-sm font-medium">
                  {c.title ?? c.account.name}
                </span>
                <span className="text-xs text-muted-foreground">{c.account.name}</span>
                {c.messages[0] ? (
                  <span className="mt-0.5 truncate text-[11px] text-muted-foreground/60">
                    {c.messages[0].senderName}: {c.messages[0].content}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {showNew ? (
          <div className="flex flex-1 items-start justify-center overflow-y-auto bg-card p-8">
            <form onSubmit={createConversation} className="w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">
                  New client conversation
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="text-muted-foreground/60 hover:text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Creates a unique chat link you can share with the client — no app or login needed on
                their end.
              </p>
              <select
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Account — required</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <select
                value={newContactId}
                onChange={(e) => setNewContactId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">No specific contact</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName ?? ""}
                  </option>
                ))}
              </select>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Conversation title (optional)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!newAccountId || creating}
                  className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create & get link"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : active ? (
          <>
            {/* Thread header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {active.title ?? active.account.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {active.account.name}
                  {active.contact
                    ? ` · ${active.contact.firstName} ${active.contact.lastName ?? ""}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyLink(active.token)}
                  title="Copy client portal link"
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-teal-50 hover:text-teal-700"
                >
                  {copiedToken === active.token ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedToken === active.token ? "Copied!" : "Copy link"}
                </button>
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open client portal"
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-teal-50 hover:text-teal-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview portal
                </a>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-muted/40 px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <p className="text-muted-foreground/60 text-sm">No messages yet.</p>
                  <p className="text-xs text-muted-foreground/60">
                    Share the portal link with your client so they can chat with you here.
                  </p>
                  <button
                    type="button"
                    onClick={() => copyLink(active.token)}
                    className="flex items-center gap-1.5 rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy client link
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {messages.map((msg) => {
                    const isAgent = msg.senderType === "AGENT";
                    return (
                      <li
                        key={msg.id}
                        className={cn("flex flex-col", isAgent ? "items-end" : "items-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                            isAgent
                              ? "rounded-br-sm bg-teal-600 text-white"
                              : "rounded-bl-sm bg-card text-foreground shadow-sm border border-border",
                          )}
                        >
                          {msg.content}
                        </div>
                        <span className="mt-1 text-[10px] text-muted-foreground/60">
                          {msg.senderName} · {fmtTime(msg.createdAt)}
                        </span>
                      </li>
                    );
                  })}
                  <div ref={bottomRef} />
                </ul>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={send}
              className="flex items-center gap-2 border-t border-border bg-card px-4 py-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Reply to client…"
                className="flex-1 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm outline-none focus:border-teal-400 focus:bg-background"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  input.trim() && !sending
                    ? "bg-teal-600 text-white hover:bg-teal-700"
                    : "bg-slate-200 text-muted-foreground/60 cursor-not-allowed",
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-card">
            <div className="text-center">
              <p className="text-muted-foreground/60">No conversation selected.</p>
              <button
                type="button"
                onClick={() => setShowNew(true)}
                className="mt-3 rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700"
              >
                Start a client chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

type SessionSummary = {
  id: string;
  title: string | null;
  messageCount: number;
  lastMessageAt: string;
};

type Props = {
  onSelect: (sessionId: string) => void;
  currentSessionId: string | null;
};

export default function CopilotConversationList({
  onSelect,
  currentSessionId,
}: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/copilot/sessions")
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="px-4 py-3 text-xs text-gray-400">Loading history…</p>;
  }

  if (sessions.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-gray-400">No past conversations.</p>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {sessions.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className={`flex items-start gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 ${
            s.id === currentSessionId ? "bg-[#006D77]/5 font-medium" : ""
          }`}
        >
          <Clock size={13} className="mt-0.5 shrink-0 text-gray-400" />
          <div className="min-w-0">
            <p className="truncate text-gray-800">
              {s.title || "Untitled conversation"}
            </p>
            <p className="text-xs text-gray-400">
              {s.messageCount} messages ·{" "}
              {new Date(s.lastMessageAt).toLocaleDateString()}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

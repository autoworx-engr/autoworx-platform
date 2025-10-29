"use client";

import * as React from "react";
import { MessageSquare, Wand2 } from "lucide-react";
import { getSmartReplies } from "@/actions/communication/ai-reply/smart-reply";

type Props = {
  clientId: number;
  companyId: number;
  onPick: (text: string) => void;
  draft?: string;
};

export default function SmartReplyBar({
  clientId,
  companyId,
  onPick,
  draft,
}: Props) {
  const [loading, setLoading] = React.useState<null | "suggest" | "enhance">(
    null
  );
  const [items, setItems] = React.useState<{ text: string }[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const normalize = (res: unknown) =>
    Array.isArray(res)
      ? res
          .filter((x: any) => x?.text)
          .map((x: any) => ({ text: String(x.text) }))
      : [];

  const handleSuggest = async () => {
    try {
      setLoading("suggest");
      setError(null);
      setItems([]);
      const res = await getSmartReplies({
        clientId,
        companyId,
        maxSuggestions: 3,
        tone: "friendly",
        mode: "suggest",
      } as any);
      setItems(normalize(res));
    } catch {
      setError("Couldn’t load smart replies.");
    } finally {
      setLoading(null);
    }
  };

  const handleEnhance = async () => {
    if (!draft?.trim()) {
      setError("Type something to enhance first.");
      return;
    }
    try {
      setLoading("enhance");
      setError(null);
      setItems([]);
      const res = await getSmartReplies({
        clientId,
        companyId,
        maxSuggestions: 3,
        tone: "friendly",
        mode: "enhance",
        draft,
      } as any);
      setItems(normalize(res));
    } catch {
      setError("Couldn’t enhance draft.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 pb-2 px-2">
      {/* Buttons row */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSuggest}
          disabled={!!loading}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <MessageSquare className="h-4 w-4" />
          {loading === "suggest" ? "Generating…" : "Generate replies"}
        </button>

        <button
          type="button"
          onClick={handleEnhance}
          disabled={!!loading}
          className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-60"
          title="Enhance current draft"
        >
          <Wand2 className="h-4 w-4" />
          {loading === "enhance" ? "Enhancing…" : "Enhance draft"}
        </button>
      </div>

      {error && <span className="text-xs text-red-500">{error}</span>}

      {/* Suggestions list */}
      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPick(s.text)}
              className="w-fit rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-left hover:bg-gray-200"
            >
              {s.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

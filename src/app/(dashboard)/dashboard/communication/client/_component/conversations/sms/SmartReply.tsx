"use client";

import { getSmartReplies } from "@/actions/communication/ai-reply/smart-reply";
import UpgradePlanBanner from "@/components/UpgradePlanBanner";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, MessageSquare, Sparkles, Wand2, X } from "lucide-react";
import * as React from "react";

type Props = {
  clientId: number;
  companyId: number;
  onPick: (text: string) => void;
  draft?: string;
  context?: "sms" | "email";
  isAllowed?: boolean;
};

const suggestionVariants = {
  hidden: {
    height: 0,
    opacity: 0,
  },
  visible: {
    height: "auto",
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

export default function SmartReplyBar({
  clientId,
  companyId,
  onPick,
  draft,
  context = "sms",
  isAllowed = true,
}: Props) {
  const [loading, setLoading] = React.useState<null | "suggest" | "enhance">(
    null,
  );
  const [items, setItems] = React.useState<{ text: string }[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = React.useState(false);

  if (!isAllowed) {
    return (
      <div className="flex w-full flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setShowUpgradeBanner((prev) => !prev)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#8B5CF6] text-white shadow transition hover:opacity-90"
          aria-label="Show AI Smart Replies upgrade info"
          title="AI Smart Replies requires an upgrade"
        >
          {showUpgradeBanner ? (
            <X className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </button>

        {showUpgradeBanner && (
          <div className="w-full">
            <UpgradePlanBanner
              title="AI Smart Replies is not available on your plan"
              description="Upgrade to generate and enhance AI-powered reply suggestions in your conversations."
              ctaLabel="Upgrade Plan"
            />
          </div>
        )}
      </div>
    );
  }

  const normalize = (res: unknown) => {
    // If it's a string, try to parse it as JSON
    if (typeof res === "string") {
      try {
        const parsed = JSON.parse(res);
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          return parsed.suggestions
            .filter((x: any) => x?.text)
            .map((x: any) => ({ text: String(x.text) }));
        }
      } catch (e) {
        console.error("[SmartReply] Failed to parse string response:", e);
        return [];
      }
    }

    // Normal array handling
    return Array.isArray(res)
      ? res
          .filter((x: any) => x?.text)
          .map((x: any) => ({ text: String(x.text) }))
      : [];
  };

  const handleSuggest = async () => {
    try {
      setLoading("suggest");
      setError(null);
      setItems([]);
      setIsOpen(false);
      const res = await getSmartReplies({
        clientId,
        companyId,
        maxSuggestions: 3,
        tone: "friendly",
        mode: "suggest",
        context,
      });
      const normalized = normalize(res);
      setItems(normalized);
      // Trigger open animation after items are set
      if (normalized.length > 0) {
        setTimeout(() => setIsOpen(true), 0);
      }
    } catch {
      setError("Couldn't load smart replies.");
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
      setIsOpen(false);
      const res = await getSmartReplies({
        clientId,
        companyId,
        maxSuggestions: 3,
        tone: "friendly",
        mode: "enhance",
        draft,
        context,
      });
      const normalized = normalize(res);
      setItems(normalized);
      // Trigger open animation after items are set
      if (normalized.length > 0) {
        setTimeout(() => setIsOpen(true), 0);
      }
    } catch {
      setError("Couldn't enhance draft.");
    } finally {
      setLoading(null);
    }
  };

  const handleToggleSuggestions = () => {
    setIsOpen((prev) => !prev);
  };

  const handlePickItem = (text: string) => {
    onPick(text);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-2 pb-2 px-2">
      {/* Buttons row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSuggest}
            disabled={!!loading}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <MessageSquare className="h-4 w-4" />
            {loading === "suggest"
              ? "Generating…"
              : "Generate AI Smart Replies"}
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
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleToggleSuggestions}
            className={` bg-white rounded-full p-1 transition-transform duration-300 ${isOpen ? "" : "rotate-180"}`}
          >
            <ArrowDown
              strokeWidth={2.5}
              className="mx-auto h-5 w-5 text-slate-500"
            />
          </button>
        )}
      </div>

      {error && <span className="text-xs text-red-500">{error}</span>}

      {/* Suggestions list */}

      <AnimatePresence>
        {items.length > 0 && isOpen && (
          <motion.div
            variants={suggestionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col gap-2 overflow-hidden"
          >
            {items.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePickItem(s.text)}
                className="w-fit rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-left hover:bg-gray-200"
              >
                {s.text}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

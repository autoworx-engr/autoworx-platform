"use client";

import { useCallback, useEffect, useState } from "react";
import { useDraftPreviewStore } from "@/stores/draftPreviewStore";

export type DraftSection = "client" | "internal" | "collaboration";

interface UseMessageDraftParams {
  section: DraftSection;
  // "" for collaboration; "sms"|"email"|"messenger"|"instagram" for client;
  // "dm"|"group" for internal (disambiguates the targetId namespace there).
  channel: string;
  targetId: number | null | undefined;
}

// Exported so list rows (useDraftPreview) can compute the same key and read
// the same persisted value without duplicating the format/logic here.
export function draftKey(
  section: DraftSection,
  channel: string,
  targetId: number,
) {
  return `messageDraft:${section}:${channel}:${targetId}`;
}

export function readDraft(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function publishPreview(key: string, value: string) {
  const store = useDraftPreviewStore.getState();
  if (value.trim()) {
    store.setPreview(key, value);
  } else {
    store.clearPreview(key);
  }
}

function writeDraft(key: string, value: string) {
  try {
    if (value.trim()) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // localStorage can throw (quota exceeded, private browsing) — a draft
    // is a convenience, not critical, so fail silently
  }
}

/**
 * Local-only draft (WhatsApp-style): persisted per-browser in localStorage,
 * keyed by conversation. No network call, no cross-device/tab sync.
 */
export function useMessageDraft({
  section,
  channel,
  targetId,
}: UseMessageDraftParams) {
  const enabled = targetId != null && Number.isFinite(targetId);
  const key = enabled ? draftKey(section, channel, targetId as number) : null;

  const [text, setText] = useState("");

  // Load the right draft whenever the conversation identity changes.
  // (Runs client-side only — fine, since this whole file is "use client"
  // and localStorage isn't available during SSR anyway.)
  useEffect(() => {
    if (!key) {
      setText("");
      return;
    }
    const value = readDraft(key);
    setText(value);
    publishPreview(key, value);
  }, [key]);

  const setDraftText = useCallback(
    (value: string) => {
      setText(value);
      if (key) {
        writeDraft(key, value);
        publishPreview(key, value);
      }
    },
    [key],
  );

  const clearDraft = useCallback(() => {
    setText("");
    if (key) {
      writeDraft(key, "");
      publishPreview(key, "");
    }
  }, [key]);

  return { draftText: text, setDraftText, clearDraft };
}

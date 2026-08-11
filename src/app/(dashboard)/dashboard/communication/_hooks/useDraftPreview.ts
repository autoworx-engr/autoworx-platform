"use client";

import { useEffect, useState } from "react";
import { useDraftPreviewStore } from "@/stores/draftPreviewStore";
import { draftKey, readDraft, type DraftSection } from "./useMessageDraft";

/**
 * Read-only draft text for a conversation-list row. Prefers the live value
 * from the shared store (populated while that conversation's compose box is
 * open) and falls back to the persisted localStorage value for rows whose
 * compose box hasn't been opened this session.
 */
export function useDraftPreview(
  section: DraftSection,
  channel: string,
  targetId: number | null | undefined,
): string {
  const enabled = targetId != null && Number.isFinite(targetId);
  const key = enabled ? draftKey(section, channel, targetId as number) : null;

  const [initial, setInitial] = useState("");
  useEffect(() => {
    setInitial(key ? readDraft(key) : "");
  }, [key]);

  const live = useDraftPreviewStore((state) =>
    key ? state.previews[key] : undefined,
  );

  return live ?? initial;
}

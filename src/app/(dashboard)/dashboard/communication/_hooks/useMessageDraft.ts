"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type DraftSection = "client" | "internal" | "collaboration";

interface UseMessageDraftParams {
  section: DraftSection;
  // "" for collaboration; "sms"|"email"|"messenger"|"instagram" for client;
  // "dm"|"group" for internal (disambiguates the targetId namespace there).
  channel: string;
  targetId: number | null | undefined;
}

const DEBOUNCE_MS = 600;
const MAX_WAIT_MS = 3000;

function draftQueryKey(
  section: DraftSection,
  channel: string,
  targetId: number,
) {
  return ["messageDraft", section, channel, targetId] as const;
}

async function fetchDraft(
  section: DraftSection,
  channel: string,
  targetId: number,
) {
  const params = new URLSearchParams({
    section,
    channel,
    targetId: String(targetId),
  });
  const res = await fetch(`/api/communication/drafts?${params.toString()}`);
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || "Failed to load draft");
  return json.data as { message: string; updatedAt: string | null };
}

async function saveDraft(
  section: DraftSection,
  channel: string,
  targetId: number,
  message: string,
) {
  await fetch("/api/communication/drafts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, channel, targetId, message }),
  });
}

/**
 * Server-synced draft for one conversation (Telegram/Slack-style): fetched
 * when the thread opens, autosaved on a debounce+maxWait while typing, and
 * cleared once the real message sends. Debounce alone can delay saving
 * indefinitely during continuous typing, so maxWait forces a save every 3s.
 */
export function useMessageDraft({
  section,
  channel,
  targetId,
}: UseMessageDraftParams) {
  const queryClient = useQueryClient();
  const enabled = targetId != null && Number.isFinite(targetId);
  const key = enabled
    ? draftQueryKey(section, channel, targetId as number)
    : (["messageDraft", "disabled"] as const);

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => fetchDraft(section, channel, targetId as number),
    enabled,
    staleTime: 30_000,
  });

  const [text, setText] = useState("");
  const latestValueRef = useRef("");
  const lastSyncedRef = useRef("");
  const pendingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
    debounceTimerRef.current = null;
    maxWaitTimerRef.current = null;
  };

  const flush = useCallback(
    (value: string) => {
      pendingRef.current = false;
      clearTimers();
      if (!enabled || value === lastSyncedRef.current) return;
      lastSyncedRef.current = value;
      saveDraft(section, channel, targetId as number, value).catch(() => {
        // best-effort autosave — a failed save just means this draft won't
        // restore next time, nothing user-facing to recover here
      });
    },
    [section, channel, targetId, enabled],
  );

  // Conversation switched: drop any pending save for the OLD thread (it has
  // its own key/history) and start blank until this thread's draft arrives.
  useEffect(() => {
    pendingRef.current = false;
    clearTimers();
    lastSyncedRef.current = "";
    latestValueRef.current = "";
    setText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, channel, targetId]);

  // Adopt the server value once loaded — unless the user already started
  // typing before this (slow) fetch resolved.
  useEffect(() => {
    if (data && !pendingRef.current) {
      lastSyncedRef.current = data.message;
      latestValueRef.current = data.message;
      setText(data.message);
    }
  }, [data]);

  const setDraftText = useCallback(
    (value: string) => {
      setText(value);
      latestValueRef.current = value;
      pendingRef.current = true;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        flush(latestValueRef.current);
      }, DEBOUNCE_MS);

      if (!maxWaitTimerRef.current) {
        maxWaitTimerRef.current = setTimeout(() => {
          flush(latestValueRef.current);
        }, MAX_WAIT_MS);
      }
    },
    [flush],
  );

  const clearDraft = useCallback(() => {
    pendingRef.current = false;
    clearTimers();
    lastSyncedRef.current = "";
    latestValueRef.current = "";
    setText("");
    if (enabled) {
      saveDraft(section, channel, targetId as number, "").catch(() => {});
      queryClient.setQueryData(key, { message: "", updatedAt: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, channel, targetId, enabled, queryClient]);

  // A debounce window still open at unmount (e.g. user navigated away right
  // after typing) would otherwise be lost — flush it as a last resort.
  useEffect(() => {
    return () => {
      if (pendingRef.current && enabled) {
        saveDraft(
          section,
          channel,
          targetId as number,
          latestValueRef.current,
        ).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, channel, targetId]);

  return { draftText: text, setDraftText, clearDraft };
}

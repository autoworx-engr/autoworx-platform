"use client";

import { pusher } from "@/lib/pusher/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type CallEvent = { clientId?: number | null };

const CALL_EVENTS = [
  "call-status-updated",
  "call-ended",
  "call-rejected",
  "call-accepted",
] as const;

/**
 * Refreshes the server-rendered call list whenever a call's status settles.
 *
 * `Phone` is an async server component, so the call rows are a snapshot taken
 * at render time. Without this, hanging up left the last row stuck on
 * "Ringing…" until the user reloaded the page by hand.
 */
export function useCallListRefresh(clientId: number) {
  const router = useRouter();
  const { data: session } = useSession();
  const companyId = session?.user?.companyId ?? null;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const channelName = `company-${companyId}`;
    const channel = pusher.subscribe(channelName);

    const handler = (data: CallEvent) => {
      // Events carry the client they belong to; ignore other conversations so
      // we don't refresh this route for unrelated calls.
      if (data?.clientId != null && data.clientId !== clientId) return;
      // Twilio writes the recording asynchronously after the call ends, so give
      // the recording webhook a moment before pulling fresh rows. A single
      // pending refresh is enough no matter how many events land.
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        router.refresh();
      }, 4000);
    };

    CALL_EVENTS.forEach((event) => channel.bind(event, handler));

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      CALL_EVENTS.forEach((event) => channel.unbind(event, handler));
      pusher.unsubscribe(channelName);
    };
  }, [companyId, clientId, router]);
}

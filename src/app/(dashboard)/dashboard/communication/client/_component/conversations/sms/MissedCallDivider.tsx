"use client";

import { PhoneMissed } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The missed-call marker inside the SMS thread.
 *
 * Rendered as a centred divider rather than a bubble — it isn't a message
 * anyone sent, it's the event that explains why the auto text-back below it
 * exists. Clicking it opens the phone tab, where the call itself lives.
 */
export default function MissedCallDivider({ at }: { at: string | Date }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Mirrors ChatHead's tab switching — the open tab is driven by `?open=`.
  const openPhoneTab = () => {
    const params = new URLSearchParams(searchParams ?? undefined);
    params.set("open", "PHONE");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const time = new Date(at);
  const label = isNaN(time.getTime())
    ? ""
    : time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

  return (
    <div className="flex w-full items-center gap-3 px-4 py-2">
      <span className="h-px flex-1 bg-rose-200 dark:bg-rose-900/60" />
      <button
        type="button"
        onClick={openPhoneTab}
        title={`${time.toLocaleString()} — open in the phone tab`}
        className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100 hover:ring-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900 dark:hover:bg-rose-900/50"
      >
        <PhoneMissed className="h-3 w-3" />
        Missed call
        {label && <span className="text-rose-400">· {label}</span>}
      </button>
      <span className="h-px flex-1 bg-rose-200 dark:bg-rose-900/60" />
    </div>
  );
}

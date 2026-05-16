"use client";

import { disconnectFacebookPage } from "@/actions/meta/disconnectFacebookPage";
import { errorToast, successToast } from "@/lib/toast";
import { Loader2, Unplug } from "lucide-react";
import { useState } from "react";

type TProps = { pageDbId: number; isActive: boolean };

export default function DisconnectPageButton({ pageDbId, isActive }: TProps) {
  const [pending, setPending] = useState(false);

  if (!isActive) return null;

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Disconnect this Facebook Page? Messenger messages will stop syncing.",
      )
    )
      return;
    setPending(true);
    try {
      await disconnectFacebookPage(pageDbId);
      successToast("Facebook Page disconnected.");
    } catch {
      errorToast("Failed to disconnect. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={handleDisconnect}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/30 dark:bg-zinc-900 dark:text-red-400"
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Unplug className="h-3 w-3" />
      )}
      Disconnect
    </button>
  );
}

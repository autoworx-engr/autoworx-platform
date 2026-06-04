"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check } from "lucide-react";

interface Props {
  isConnected: boolean;
}

export default function ConnectGBP({ isConnected }: Props) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function handleDisconnect() {
    if (
      !confirm(
        "Disconnect Google Business Profile? Existing review data will be kept.",
      )
    )
      return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/gbp/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Failed to disconnect");
      toast.success("Disconnected from Google Business Profile");
      router.refresh();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/gbp/reviews", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      toast.success(`Synced ${data.data?.synced ?? 0} reviews`);
      router.refresh();
    } catch {
      toast.error("Failed to sync reviews");
    } finally {
      setSyncing(false);
    }
  }

  if (!isConnected) {
    return (
      <a
        href="/api/gbp/auth"
        className="rounded-md bg-[#6571FF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5560ee] transition-colors"
      >
        Connect Google Business Profile
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
        <Check size={14} /> Connected
      </span>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {syncing ? "Syncing..." : "Sync Reviews"}
      </button>
      <button
        onClick={handleDisconnect}
        disabled={disconnecting}
        className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:hover:bg-red-900/20 transition-colors"
      >
        {disconnecting ? "Disconnecting..." : "Disconnect"}
      </button>
    </div>
  );
}

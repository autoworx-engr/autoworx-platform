"use client";

import { initiateMetaConnect } from "@/actions/meta/connect";
import { disconnectMeta } from "@/actions/meta/disconnect";
import { errorToast, successToast } from "@/lib/toast";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useState } from "react";

type MetaCredential = {
  id: number;
  pageId: string;
  pageName: string | null;
  instagramAccountId: string | null;
  instagramUsername: string | null;
};

type Props = {
  credential: MetaCredential | null;
};

/**
 * Settings card for the Meta (Facebook / Instagram) integration.
 *
 * Connected state: shows the linked Facebook Page name and Instagram username
 * (if any), along with a Disconnect button that calls `disconnectMeta`.
 *
 * Disconnected state: shows a short description and a "Connect with Meta"
 * button that submits `initiateMetaConnect` as a server action, redirecting
 * the user to the Facebook OAuth dialog.
 *
 * @param credential - Active `MetaCredentials` row, or `null` if not connected
 */
export default function MetaIntegrationCard({ credential }: Props) {
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!credential) return;
    setDisconnecting(true);
    try {
      await disconnectMeta(credential.id);
      successToast("Meta disconnected.");
    } catch (err) {
      errorToast(errorHandler(err).message);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/10">
        {/* Meta "M" logo */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white font-bold text-base"
          style={{
            background: "linear-gradient(135deg, #1877F2 0%, #E1306C 100%)",
          }}
        >
          M
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Meta Messaging
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Facebook &amp; Instagram
          </p>
        </div>

        {credential && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {credential ? (
          <div className="space-y-3">
            {/* Page info */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400 w-24 shrink-0">
                Facebook Page
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {credential.pageName ?? credential.pageId}
              </span>
            </div>

            {credential.instagramUsername && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400 w-24 shrink-0">
                  Instagram
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  @{credential.instagramUsername}
                </span>
              </div>
            )}

            <button
              type="button"
              disabled={disconnecting}
              onClick={handleDisconnect}
              className="mt-2 rounded-md border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect your Facebook Page and Instagram Business account to send
              and receive messages directly inside AutoWorx.
            </p>
            <form action={initiateMetaConnect}>
              <button
                type="submit"
                className="rounded-md px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1877F2" }}
              >
                Connect with Meta
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

import { getConnectedInstagramAccounts } from "@/actions/instagram/getConnectedInstagramAccounts";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, XCircle, RefreshCw, Link2 } from "lucide-react";
import DisconnectInstagramButton from "./DisconnectInstagramButton";

function InstagramGradientIcon() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#E1306C] to-[#833AB4]">
      <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    </span>
  );
}

export default async function InstagramSettings({
  successParam,
  errorParam,
}: {
  successParam?: string;
  errorParam?: string;
}) {
  const accounts = await getConnectedInstagramAccounts();

  return (
    <div className="w-full rounded-lg border border-zinc-200 bg-background p-6 dark:border-white/10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <InstagramGradientIcon />
          <h2 className="text-base font-semibold">Instagram DM</h2>
        </div>
        <Link
          href="/api/instagram/auth"
          className="inline-flex items-center gap-1.5 rounded-md bg-[#6470FF] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#4f5ce6]"
        >
          <Link2 className="h-3.5 w-3.5" />
          {accounts.length === 0 ? "Connect Instagram" : "Add Another Account"}
        </Link>
      </div>

      {successParam === "1" && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800 dark:border-green-800/30 dark:bg-green-900/20 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Instagram account connected successfully!
        </div>
      )}
      {errorParam && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-300">
          <XCircle className="h-4 w-4 shrink-0" />
          {friendlyError(errorParam)}
        </div>
      )}

      {accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-300 py-10 text-center dark:border-white/10">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No Instagram accounts connected yet.
          </p>
          <p className="max-w-xs text-xs text-zinc-400 dark:text-zinc-500">
            Click <strong>Connect Instagram</strong> above. Your Instagram
            account must be a Professional (Business or Creator) account linked
            to a Facebook Page.
          </p>
        </div>
      )}

      {accounts.length > 0 && (
        <ul className="divide-y divide-zinc-100 dark:divide-white/5">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Image
                  src={"/images/default.png"}
                  alt={account.username ?? "Instagram"}
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-white/10"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    @{account.username ?? account.igUserId}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    IG ID: {account.igUserId}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {account.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                    <XCircle className="h-3 w-3" /> Disconnected
                  </span>
                )}
                {!account.isActive && (
                  <Link
                    href="/api/instagram/auth"
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <RefreshCw className="h-3 w-3" /> Reconnect
                  </Link>
                )}
                <DisconnectInstagramButton
                  igAccountDbId={account.id}
                  isActive={account.isActive}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
        DMs from connected Instagram accounts appear in the client inbox under
        the <strong>Instagram</strong> tab.
      </p>
    </div>
  );
}

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    invalid_state:
      "Security check failed (invalid state). Please try connecting again.",
    access_denied:
      "You denied access. Please try again and approve permissions.",
    no_pages_found: "No Facebook Pages found on your account.",
    no_instagram_accounts:
      "No Instagram Professional accounts found linked to your Facebook Pages.",
  };
  return map[code] ?? `Connection failed: ${code}`;
}

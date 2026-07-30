import { getConnectedFacebookPages } from "@/actions/meta/disconnectFacebookPage";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, XCircle, RefreshCw, Link2 } from "lucide-react";
import DisconnectPageButton from "./DisconnectPageButton";

export default async function FacebookPagesSettings({
  successParam,
  errorParam,
}: {
  successParam?: string;
  errorParam?: string;
}) {
  const pages = await getConnectedFacebookPages();

  return (
    <div className="w-full rounded-lg border border-zinc-200 bg-background p-6 dark:border-white/10">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Facebook Messenger gradient icon */}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0866FF] to-[#0057d9]">
            <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4">
              <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.906 1.318 5.51 3.396 7.28V23l4.128-2.267c1.104.305 2.274.473 3.476.473 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.008 12.445-2.55-2.72-4.977 2.72 5.474-5.806 2.613 2.72 4.914-2.72-5.474 5.806z" />
            </svg>
          </span>
          <h2 className="text-base font-semibold">Facebook Messenger</h2>
        </div>

        <Link
          href="/api/meta/auth"
          className="inline-flex items-center gap-1.5 rounded-md bg-[#6470FF] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#4f5ce6]"
        >
          <Link2 className="h-3.5 w-3.5" />
          {pages.length === 0 ? "Connect Facebook Page" : "Add Another Page"}
        </Link>
      </div>

      {/* Status toasts from OAuth redirect */}
      {successParam === "1" && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800 dark:border-green-800/30 dark:bg-green-900/20 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Facebook Page(s) connected successfully!
        </div>
      )}
      {errorParam && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-300">
          <XCircle className="h-4 w-4 shrink-0" />
          {friendlyError(errorParam)}
        </div>
      )}

      {/* Empty state */}
      {pages.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-300 py-10 text-center dark:border-white/10">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No Facebook Pages connected yet.
          </p>
          <p className="max-w-xs text-xs text-zinc-400 dark:text-zinc-500">
            Click <strong>Connect Facebook Page</strong> above. You&apos;ll log
            in with Facebook and grant Messenger permissions for your page(s).
          </p>
        </div>
      )}

      {/* Connected pages list */}
      {pages.length > 0 && (
        <ul className="divide-y divide-zinc-100 dark:divide-white/5">
          {pages.map((page) => (
            <li
              key={page.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              {/* Left: avatar + info */}
              <div className="flex min-w-0 items-center gap-3">
                <Image
                  src={"/images/default.png"}
                  alt={page.pageName}
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-white/10"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {page.pageName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Page ID: {page.pageId}
                  </p>
                </div>
              </div>

              {/* Right: status + actions */}
              <div className="flex shrink-0 items-center gap-2">
                {page.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                    <XCircle className="h-3 w-3" /> Disconnected
                  </span>
                )}

                {!page.isActive && (
                  <Link
                    href="/api/meta/auth"
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <RefreshCw className="h-3 w-3" /> Reconnect
                  </Link>
                )}

                <DisconnectPageButton
                  pageDbId={page.id}
                  isActive={page.isActive}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Help note */}
      <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
        Messages from connected pages will appear in the client inbox under the{" "}
        <strong>Messenger</strong> tab.
      </p>
    </div>
  );
}

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    access_denied:
      "You denied access. Please try again and approve permissions.",
    no_pages_found: "No Facebook Pages found on your account.",
  };
  return map[code] ?? `Connection failed: ${code}`;
}

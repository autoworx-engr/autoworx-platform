"use client";

import { connectMetaPage } from "@/actions/meta/connectPage";
import { type MetaPageOption } from "@/app/api/meta/callback/route";
import { cn } from "@/lib/cn";
import { CheckCircle2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";

type Props = {
  pages: MetaPageOption[];
  data: string;
};

/**
 * Page selection form rendered after the Meta OAuth callback collects the user's
 * Facebook Pages.
 *
 * Each page renders as a selectable card showing the page name, category, and
 * whether an Instagram Business Account is linked. A checkmark appears on the
 * selected card. Submitting the form calls `connectMetaPage` with the encrypted
 * payload and the chosen `pageId`.
 *
 * @param pages - Array of pages from the decrypted `MetaPendingPayload`
 * @param data - The raw (base64url-encoded encrypted) payload string, passed through
 *               to `connectMetaPage` as a hidden form field
 */
export default function PageSelectForm({ pages, data }: Props) {
  const [selectedId, setSelectedId] = useState<string>(pages[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    const fd = new FormData(formRef.current!);
    startTransition(() => {
      connectMetaPage(fd);
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <input type="hidden" name="data" value={data} />
      <input type="hidden" name="pageId" value={selectedId} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pages.map((page) => {
          const isSelected = selectedId === page.id;
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => setSelectedId(page.id)}
              className={cn(
                "relative w-full rounded-xl border p-4 text-left transition-all duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                isSelected
                  ? "border-teal-500 bg-teal-50 shadow-md dark:bg-teal-900/20"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm dark:border-white/10 dark:bg-zinc-900",
              )}
            >
              {isSelected && (
                <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-teal-600 dark:text-teal-400" />
              )}

              {/* Page name */}
              <p className="pr-6 text-sm font-semibold text-zinc-900 dark:text-white">
                {page.name}
              </p>

              {/* Category */}
              {page.category && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {page.category}
                </p>
              )}

              {/* Instagram badge */}
              <div className="mt-2.5 flex items-center gap-1.5">
                {page.instagramAccountId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#833AB4]/10 to-[#E1306C]/10 px-2 py-0.5 text-[11px] font-medium text-[#C13584] ring-1 ring-[#C13584]/20">
                    <span className="text-[10px] font-bold">IG</span>
                    {page.instagramUsername
                      ? `@${page.instagramUsername}`
                      : "Instagram linked"}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-400 dark:bg-white/5">
                    No Instagram linked
                  </span>
                )}

                <span className="inline-flex items-center gap-1 rounded-full bg-[#1877F2]/10 px-2 py-0.5 text-[11px] font-medium text-[#1877F2] ring-1 ring-[#1877F2]/20">
                  <span className="font-bold">f</span> Facebook
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={!selectedId || isPending}
          className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "#1877F2" }}
        >
          {isPending ? "Connecting…" : "Connect this page"}
        </button>
        <a
          href="/dashboard/settings/communications"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

"use client";

import { successToast } from "@/lib/toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Invisible client component that runs once on the Settings → Communications page.
 *
 * Reads the `?meta=connected` query param that the OAuth callback sets after a
 * successful connection, shows a success toast, then removes the param from the
 * URL so it doesn't persist across refreshes.
 */
export default function MetaConnectedToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const meta = searchParams?.get("meta");
    if (meta === "connected") {
      successToast("Meta (Facebook / Instagram) connected successfully!");
      const params = new URLSearchParams(searchParams.toString());
      params.delete("meta");
      const query = params.toString();
      router.replace(
        `/dashboard/settings/communications${query ? `?${query}` : ""}`,
        { scroll: false },
      );
    }
  }, [searchParams, router]);

  return null;
}

"use client";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import dynamic from "next/dynamic";

const Analytics = dynamic(() => import("./Analytics"), { ssr: false });

export default function DesktopAnalytics() {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return null;
  }

  return <Analytics />;
}

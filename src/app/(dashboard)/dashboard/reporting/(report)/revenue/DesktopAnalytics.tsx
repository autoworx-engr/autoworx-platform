"use client";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import dynamic from "next/dynamic";

const Analytics = dynamic(() => import("./Analytics"), { ssr: false });

type DesktopAnalyticsProps = {
  startDate?: string;
  endDate?: string;
};

export default function DesktopAnalytics({ startDate, endDate }: DesktopAnalyticsProps) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return null;
  }

  return <Analytics startDate={startDate} endDate={endDate} />;
}

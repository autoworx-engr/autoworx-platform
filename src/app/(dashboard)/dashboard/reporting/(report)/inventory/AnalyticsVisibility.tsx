"use client";
import { useIsDesktop } from "@/hooks/useIsDesktop";

export default function AnalyticsVisibility({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return null;
  }

  return <>{children}</>;
}

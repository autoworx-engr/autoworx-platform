"use client";

import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  DollarSign,
  FileText,
  Gift,
  Percent,
  Settings,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

type VirtualShopTabsProps = {
  shopId?: number;
  children: React.ReactNode;
};

const TABS = [
  { segment: "services", label: "Services", icon: Settings },
  { segment: "deposits", label: "Deposits", icon: DollarSign },
  { segment: "scheduling", label: "Scheduling", icon: CalendarDays },
  { segment: "financial", label: "Financial", icon: Percent },
  { segment: "gift-cards", label: "Gift Cards", icon: Gift },
  { segment: "gift-card-purchases", label: "GC Purchases", icon: ShoppingBag },
  { segment: "calendar", label: "Calendar", icon: Calendar },
  { segment: "estimates", label: "Estimates", icon: FileText },
  { segment: "urgent-requests", label: "Urgent Requests", icon: AlertTriangle },
] as const;

export default function VirtualShopTabs({
  shopId,
  children,
}: VirtualShopTabsProps) {
  const pathname = usePathname();
  const tabsContainerRef = useRef<HTMLUListElement>(null);

  const tabs = useMemo(
    () =>
      TABS.map((tab) => ({
        ...tab,
        href: shopId
          ? `/dashboard/virtual-shop/admin/${shopId}/${tab.segment}`
          : `/dashboard/virtual-shop/admin/${tab.segment}`,
      })),
    [shopId],
  );

  const activeHref = useMemo(() => {
    if (!pathname) {
      return tabs[0]?.href;
    }

    return (
      tabs.find((tab) => pathname.startsWith(tab.href))?.href ?? tabs[0]?.href
    );
  }, [pathname, tabs]);

  useEffect(() => {
    if (!tabsContainerRef.current) return;

    const activeTab = tabsContainerRef.current.querySelector(
      '[data-active="true"]',
    ) as HTMLElement | null;

    if (!activeTab) return;

    const container = tabsContainerRef.current;
    const tabRect = activeTab.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const tabCenterOffset =
      tabRect.left - containerRect.left + tabRect.width / 2;
    const containerCenter = containerRect.width / 2;
    const scrollLeft =
      container.scrollLeft + (tabCenterOffset - containerCenter);

    container.scrollTo({
      left: scrollLeft,
      behavior: "smooth",
    });
  }, [activeHref]);

  return (
    <div className="p-6">
      <nav className="mb-6 w-full md:w-auto" aria-label="Virtual shop tabs">
        <ul
          ref={tabsContainerRef}
          className="flex items-center gap-1.5 p-1.5 overflow-x-auto thin-scrollbar rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm w-full md:w-auto md:inline-flex"
        >
          {tabs.map(({ href, label, icon: Icon }) => {
            const isActive = href === activeHref;

            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  data-active={isActive}
                  className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-base font-medium transition-all duration-300 ease-out ${
                    isActive
                      ? "text-white shadow-md shadow-indigo-500/25 ring-1 ring-black/5 -translate-y-px"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] -z-10" />
                  )}
                  <Icon
                    size={18}
                    className={`transition-colors duration-300 ${
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-primary"
                    }`}
                  />
                  <span className="whitespace-nowrap">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {children}
    </div>
  );
}

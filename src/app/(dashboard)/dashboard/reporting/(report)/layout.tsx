"use client";

export const dynamic = "force-dynamic";
import { usePermissionStore } from "@/stores/permissionStore";
import { Box, CreditCard, TrendingUp, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
type TProps = {
  children: React.ReactNode;
};

export default function ReportLayout({ children }: TProps) {
  const { permissions } = usePermissionStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabsContainerRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (permissions?.role === "Sales") {
      router.push("/dashboard/reporting/salesreporting");
    } else if (permissions?.role === "Technician") {
      router.push("/dashboard/reporting/technicianreporting");
    }
  }, [permissions, router]);

  // Tab system inspired by Header.tsx
  const activeView = searchParams?.get("view") || "revenue";
  const [currentView, setCurrentView] = useState<string | null>(activeView);

  const toggleButtons = [
    {
      label: "Revenue",
      href: "/dashboard/reporting/revenue?view=revenue",
      view: "revenue",
      icon: TrendingUp,
    },
    {
      label: "Inventory",
      href: "/dashboard/reporting/inventory?view=inventory",
      view: "inventory",
      icon: Box,
    },
    {
      label: "Leads",
      href: "/dashboard/reporting/leads?view=leads",
      view: "leads",
      icon: UserPlus,
    },
    {
      label: "Payments",
      href: "/dashboard/reporting/payments?view=payments",
      view: "payments",
      icon: CreditCard,
    },
    {
      label: "Teams",
      href: "/dashboard/reporting/teams?view=teams",
      view: "teams",
      requiresWorkforce: true,
      icon: Users,
    },
  ];

  // Scroll active tab to center on mobile when it changes
  useEffect(() => {
    if (tabsContainerRef.current && currentView) {
      const activeTab = tabsContainerRef.current.querySelector(
        '[data-active="true"]',
      ) as HTMLElement;
      if (activeTab) {
        const container = tabsContainerRef.current;
        const tabRect = activeTab.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Calculate scroll position to center the tab
        const tabCenterOffset =
          tabRect.left - containerRect.left + tabRect.width / 2;
        const containerCenter = containerRect.width / 2;
        const scrollLeft =
          container.scrollLeft + (tabCenterOffset - containerCenter);

        container.scrollTo({
          left: scrollLeft,
          behavior: "smooth",
        });
      }
    }
  }, [currentView]);

  return (
    <div>
      {permissions?.role === "Admin" || permissions?.role === "Manager" ? (
        <div>
          <div className="flex flex-col p-5 lg:flex-row lg:items-center">
            <h1 className="mb-4  text-slate-600 text-2xl font-bold lg:mb-0 lg:mr-4 text-left">
              Reporting
            </h1>

            {/* Tab Navigation */}
            <nav className="mt-2 lg:mt-0 w-full md:w-auto">
              <ul
                className="flex md:inline-flex items-center gap-1.5 p-1.5 overflow-x-auto thin-scrollbar rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm w-full md:w-auto"
                ref={tabsContainerRef}
              >
                {toggleButtons.map((button, index) => {
                  if (
                    button.requiresWorkforce &&
                    permissions?.companyPermissions?.workforceManagement ===
                      false
                  ) {
                    return null;
                  }
                  const isActive = button.view === currentView;
                  const Icon = (button as any).icon;

                  return (
                    <li key={index} className="shrink-0">
                      <Link
                        href={button.href}
                        onClick={() => setCurrentView(button.view)}
                        data-active={button.view === currentView}
                        className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-base font-medium transition-all duration-300 ease-out ${
                          isActive
                            ? "text-white shadow-md shadow-indigo-500/25 ring-1 ring-black/5 translate-y-[-1px]"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] -z-10" />
                        )}
                        {Icon && (
                          <Icon
                            size={18}
                            className={`transition-colors duration-300 ${isActive ? "text-white" : "text-slate-400 group-hover:text-primary"}`}
                          />
                        )}
                        <span className="whitespace-nowrap">
                          {button.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="bg-background p-5 md:rounded-lg md:shadow-md">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}

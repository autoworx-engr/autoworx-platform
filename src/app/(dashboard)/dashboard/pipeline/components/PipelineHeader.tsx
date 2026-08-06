"use client";

import { useGetPipelineColumns } from "@/hooks/pipeline/usePipelineColumns";
import { cn } from "@/lib/utils";
import SessionUserType from "@/types/sessionUserType";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ManagePipelines from "./ManagePipelines";
import PipelineTypeSelector from "./PipelineTypeSelector";

interface PipelineHeaderProps {
  title?: string;
  toggleButtons: { label: string; href: string }[];
  type: string;
}

export default function PipelineHeader({
  title,
  toggleButtons,
  type,
}: PipelineHeaderProps) {
  const pathname = usePathname();
  const [isPipelineManaged, setPipelineManaged] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUserType>();
  const tabsContainerRef = useRef<HTMLUListElement>(null);

  const { data: columns = [], refetch } = useGetPipelineColumns(type);

  // Scroll active tab to center if it changes
  useEffect(() => {
    if (tabsContainerRef.current) {
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
  }, [pathname]);

  useEffect(() => {
    const fetchUser = async () => {
      const response = await fetch("/api/getUser");
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    };
    fetchUser();
  }, []);

  // Columns are fetched automatically by useQuery
  const hasManagePipelineAccess =
    currentUser?.employeeType === "Admin" ||
    currentUser?.employeeType === "Manager";

  return (
    <header className="flex items-center justify-between p-4">
      <div className="flex w-full items-center justify-between lg:justify-start">
        <PipelineTypeSelector currentType={type as "sales" | "shop" | "team"} />

        {type !== "team" && (
          <nav className="lg:hidden">
            <ul className="flex list-none items-center p-0 lg:gap-4">
              {toggleButtons.map((button, index) => (
                <li key={index}>
                  <Link
                    href={button.href}
                    className={cn(
                      "group flex items-center justify-between rounded py-2.5 transition-all duration-300",
                      "lg:border lg:px-4",
                      pathname === button.href
                        ? "hidden lg:flex lg:bg-primary lg:text-white"
                        : "border-primary text-primary lg:bg-background",
                    )}
                  >
                    <span className="font-medium tracking-wide">
                      {button.label}
                    </span>
                    <div className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-primary to-[#818eff] shadow-sm text-white transition-all duration-300 group-hover:translate-x-1 group-hover:shadow-md lg:hidden">
                      <ChevronRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {type !== "team" && (
          <nav className="hidden lg:block w-full lg:w-auto mt-2 lg:mt-0">
            <ul
              className="flex items-center gap-1.5 p-1.5 overflow-x-auto thin-scrollbar rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm"
              ref={tabsContainerRef}
            >
              {toggleButtons.map((button, index) => {
                const isActive = pathname === button.href;

                return (
                  <li key={index} className="shrink-0">
                    <Link
                      href={button.href}
                      data-active={isActive}
                      className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-base font-medium transition-all duration-300 ease-out ${
                        isActive
                          ? "text-white shadow-md shadow-indigo-500/25 ring-1 ring-black/5 translate-y-[-1px]"
                          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] -z-10" />
                      )}
                      <span className="whitespace-nowrap">{button.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>

      {(pathname?.includes("/sales/pipeline") ||
        pathname?.includes("/shop/pipeline")) &&
        hasManagePipelineAccess && (
          <button
            onClick={() => setPipelineManaged(true)}
            className="
              w-48 hidden lg:flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white
              bg-gradient-to-r from-primary to-[#5a66ee]
              shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
              active:translate-y-0 active:scale-100
            
            "
          >
            Manage Pipelines
          </button>
        )}

      {isPipelineManaged && (
        <ManagePipelines
          columns={columns}
          onClose={() => setPipelineManaged(false)}
          pipelineType={type}
        />
      )}
    </header>
  );
}

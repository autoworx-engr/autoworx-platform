"use client";

import { ChartLine, User } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function Header() {
  const { id } = useParams()!;
  const searchParams = useSearchParams();
  const activeView = searchParams?.get("view");

  const [currentView, setCurrentView] = useState(activeView);

  const toggleButtons = [
    {
      label: "Details",
      href: `/dashboard/employee/${id}?view=details`,
      view: "details",
      icon: User,
    },
    {
      label: "Performance",
      href: `/dashboard/employee/${id}?view=performance`,
      view: "performance",
      icon: ChartLine,
    },
  ];

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 rounded-3xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-start">
        {/* Header Section */}
        <div className="space-y-1 flex items-center gap-2">
          <div className="flex flex-col gap-2 text-sm font-medium text-primary mb-2">
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 text-xs uppercase tracking-wider w-fit">
              Employee Management
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 sm:text-3xl">
              Employee Information
            </h1>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="w-full lg:w-auto">
          <ul
            className="
                flex items-center gap-1.5 p-1.5 
                overflow-x-auto no-scrollbar
                rounded-2xl border border-slate-200 dark:border-slate-800 
                bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm
                shadow-sm
            "
          >
            {toggleButtons.map((button, index) => {
              const isActive = button.view === currentView;
              const Icon = button.icon;

              return (
                <li key={index} className="shrink-0">
                  <Link
                    href={button.href}
                    onClick={() => setCurrentView(button.view)}
                    className={`
                            group relative flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-out
                            ${
                              isActive
                                ? "text-white shadow-md shadow-indigo-500/25 ring-1 ring-black/5 translate-y-[-1px]"
                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                            }
                        `}
                  >
                    {/* Animated Background for Active State */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] -z-10" />
                    )}

                    {/* Icon */}
                    <Icon
                      size={16}
                      className={`
                            transition-colors duration-300
                            ${isActive ? "text-white" : "text-slate-400 group-hover:text-primary"}
                        `}
                    />

                    {/* Label */}
                    <span className="whitespace-nowrap">{button.label}</span>

                    {/* Mobile Indicator (Optional: Replacing the old '>' with a subtle dot or keeping clean) */}
                    {/* We keep it clean as the background color clearly indicates active state now */}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

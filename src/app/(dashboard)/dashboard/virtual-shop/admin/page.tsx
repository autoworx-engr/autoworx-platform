"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent } from "@/components/Tabs";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import {
  Settings,
  DollarSign,
  CalendarDays,
  Percent,
  Gift,
  Calendar,
  FileText,
} from "lucide-react";
import ServicesTab from "./components/ServicesTab";
import DepositsTab from "./components/DepositsTab";
import SchedulingTab from "./components/SchedulingTab";
import FinancialTab from "./components/FinancialTab";
import GiftCardsTab from "./components/GiftCardsTab";
import CalendarTab from "./components/CalendarTab";
import EstimatesTab from "./components/EstimatesTab";

const TABS = [
  { value: "services", label: "Services", icon: Settings },
  { value: "deposits", label: "Deposits", icon: DollarSign },
  { value: "scheduling", label: "Scheduling", icon: CalendarDays },
  { value: "financial", label: "Financial", icon: Percent },
  { value: "gift-cards", label: "Gift Cards", icon: Gift },
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "estimates", label: "Estimates", icon: FileText },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function VirtualShopAdminPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("services");
  const tabsContainerRef = useRef<HTMLUListElement>(null);

  // Scroll active tab to center on mobile when it changes
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeTabEl = tabsContainerRef.current.querySelector(
        '[data-active="true"]'
      ) as HTMLElement;
      if (activeTabEl) {
        const container = tabsContainerRef.current;
        const tabRect = activeTabEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const tabCenterOffset =
          tabRect.left - containerRect.left + tabRect.width / 2;
        const containerCenter = containerRect.width / 2;
        const scrollLeft =
          container.scrollLeft + (tabCenterOffset - containerCenter);
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
      }
    }
  }, [activeTab]);

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
        {/* Custom ul-based tab nav */}
        <TabsPrimitive.List asChild>
          <ul ref={tabsContainerRef} className="flex items-center gap-1.5 p-1.5 mb-6 overflow-x-auto thin-scrollbar rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm w-full md:w-auto md:inline-flex">
            {TABS.map(({ value, label, icon: Icon }) => {
              const isActive = value === activeTab;
              return (
                <li key={value} className="shrink-0">
                  <TabsPrimitive.Trigger
                    value={value}
                    onClick={() => setActiveTab(value)}
                    data-active={isActive}
                    className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-base font-medium transition-all duration-300 ease-out focus-visible:outline-none ${isActive
                      ? "text-white shadow-md shadow-indigo-500/25 ring-1 ring-black/5 -translate-y-px"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#6571FF] to-[#5a66ee] -z-10" />
                    )}
                    <Icon
                      size={18}
                      className={`transition-colors duration-300 ${isActive ? "text-white" : "text-slate-400 group-hover:text-[#6571FF]"}`}
                    />
                    <span className="whitespace-nowrap">{label}</span>
                  </TabsPrimitive.Trigger>
                </li>
              );
            })}
          </ul>
        </TabsPrimitive.List>

        <TabsContent value="services">
          <ServicesTab />
        </TabsContent>
        <TabsContent value="deposits">
          <DepositsTab />
        </TabsContent>
        <TabsContent value="scheduling">
          <SchedulingTab />
        </TabsContent>
        <TabsContent value="financial">
          <FinancialTab />
        </TabsContent>
        <TabsContent value="gift-cards">
          <GiftCardsTab />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarTab />
        </TabsContent>
        <TabsContent value="estimates">
          <EstimatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}


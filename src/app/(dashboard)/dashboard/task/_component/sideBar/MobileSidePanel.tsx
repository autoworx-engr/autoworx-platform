"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PanelBottomOpen } from "lucide-react";
import { useState } from "react";
import SidePanelTabs from "./SidePanelTabs";
import { useIsAdminOrManager } from "./useIsAdminOrManager";

/**
 * Below `md` the side panel has no room next to the calendar, so tasks and
 * users live in a bottom sheet reachable from the page header instead of being
 * dropped entirely.
 */
export default function MobileSidePanel() {
  const [open, setOpen] = useState(false);
  const isAdminOrManager = useIsAdminOrManager();
  const title = isAdminOrManager ? "Tasks & Users" : "Task list";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-2 md:hidden"
        >
          <PanelBottomOpen size={16} />
          <span className="text-sm font-medium">Panel</span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-[85vh] gap-0 rounded-t-2xl px-3 pb-3 pt-2"
      >
        {/* Grabber — signals the sheet is dismissible by swiping down. */}
        <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />

        <div className="flex shrink-0 items-center justify-between py-2">
          <SheetTitle className="text-base font-semibold text-slate-700">
            {title}
          </SheetTitle>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <SidePanelTabs />
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ListChecks } from "lucide-react";
import { useState } from "react";
import SidePanelTabs from "./SidePanelTabs";
import { useIsAdminOrManager } from "./useIsAdminOrManager";

export default function MobileSidePanel() {
  const [open, setOpen] = useState(false);
  const isAdminOrManager = useIsAdminOrManager();
  const title = isAdminOrManager ? "Tasks & Users" : "Task list";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="h-9 shrink-0 gap-1 text-xs md:hidden"
          aria-label={`Open ${title}`}
        >
          <ListChecks size={16} />
          Tasks
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-[85dvh] gap-0 overflow-hidden rounded-t-2xl px-3 pb-14 pt-2 data-[side=bottom]:h-[85dvh]"
      >
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

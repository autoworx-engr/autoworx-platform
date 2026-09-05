"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import AICopilotPanel from "./AICopilotPanel";

const AI_COPILOT_ROLES = ["Admin", "Manager", "Sales"];

export default function AICopilotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const currentUser = useGetCurrentUser();

  if (!AI_COPILOT_ROLES.includes(currentUser?.employeeType ?? "")) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title="AI Copilot — coming soon"
        aria-label="Open AI Copilot"
        className="group h-9 gap-2 rounded-full text-primary hover:text-primary"
      >
        <Sparkles className="size-6 " />
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        >
          <AICopilotPanel />
        </SheetContent>
      </Sheet>
    </>
  );
}

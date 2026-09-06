"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AICopilotPanel from "./AICopilotPanel";

const AI_COPILOT_ROLES = ["Admin", "Manager", "Sales"];
const FAB_SIZE = 56;
const EDGE_GAP = 16;
const DRAG_THRESHOLD = 4;

type Point = { x: number; y: number };

function clampToViewport({ x, y }: Point): Point {
  return {
    x: Math.min(Math.max(x, EDGE_GAP), window.innerWidth - FAB_SIZE - EDGE_GAP),
    y: Math.min(
      Math.max(y, EDGE_GAP),
      window.innerHeight - FAB_SIZE - EDGE_GAP,
    ),
  };
}

export default function AICopilotFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Point | null>(null);
  const drag = useRef({
    active: false,
    moved: false,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
  });
  const currentUser = useGetCurrentUser();
  const pathname = usePathname();

  useEffect(() => {
    if (!position) return;
    const onResize = () => setPosition((prev) => prev && clampToViewport(prev));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [position]);

  if (!AI_COPILOT_ROLES.includes(currentUser?.employeeType ?? "")) return null;

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = {
      active: true,
      moved: false,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state.active) return;

    const travelled = Math.hypot(
      event.clientX - state.startX,
      event.clientY - state.startY,
    );
    if (!state.moved && travelled < DRAG_THRESHOLD) return;

    state.moved = true;
    setPosition(
      clampToViewport({
        x: event.clientX - state.offsetX,
        y: event.clientY - state.offsetY,
      }),
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    drag.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleClick = () => {
    if (drag.current.moved) {
      drag.current.moved = false;
      return;
    }
    setIsOpen(true);
  };

  const isCommunication = pathname.startsWith("/dashboard/communication");

  return (
    <>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        title="AI Copilot — coming soon"
        aria-label="Open AI Copilot"
        style={
          position
            ? {
                left: position.x,
                top: position.y,
                right: "auto",
                bottom: "auto",
              }
            : undefined
        }
        className={cn(
          "fixed z-40 flex size-14 cursor-grab touch-none items-center justify-center rounded-full border-2 border-primary bg-white shadow-xl transition-shadow duration-200 hover:shadow-2xl active:cursor-grabbing",
          !position && (isCommunication ? "bottom-24" : "bottom-6"),
          !position && "right-4 sm:right-6",
        )}
      >
        <Image
          src="/icons/autoworx-icon.png"
          alt=""
          width={48}
          height={48}
          draggable={false}
          className="pointer-events-none size-10 rounded-full object-contain"
        />
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

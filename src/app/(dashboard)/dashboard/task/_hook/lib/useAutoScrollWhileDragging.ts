"use client";
import { useEffect } from "react";

export default function useAutoScrollWhileDragging(
  containerRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const { top, bottom } = container.getBoundingClientRect();
      const offset = 40;
      const speed = 10;

      if (e.clientY < top + offset) {
        container.scrollBy({ top: -speed, behavior: "smooth" });
      } else if (e.clientY > bottom - offset) {
        container.scrollBy({ top: speed, behavior: "smooth" });
      }
    };

    document.addEventListener("dragover", handleMouseMove);
    return () => {
      document.removeEventListener("dragover", handleMouseMove);
    };
  }, [containerRef]);
}

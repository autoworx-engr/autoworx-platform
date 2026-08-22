"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";
import { cn } from "@/lib/cn";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

type Props = {
  text: string;
  /** Element to render the text in. */
  as?: "p" | "span" | "div";
  className?: string;
};

/**
 * Text that reveals its full value in a tooltip once it is actually clipped.
 *
 * The check is measured (`scrollWidth > clientWidth`) rather than guessed from
 * a character count, because how much fits depends on the container width — a
 * dropdown row cuts off at a different point than the trigger above it.
 */
export function TruncatedText({ text, as = "p", className }: Props) {
  const Tag = as;
  const textRef = useRef<HTMLElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    setIsTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

  // Measured on layout so the first hover already knows, and again on resize
  // because the same row reflows with the panel.
  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (textRef.current) observer.observe(textRef.current);
    return () => observer.disconnect();
  }, [measure, text]);

  const content = (
    <Tag
      ref={textRef as React.Ref<HTMLParagraphElement>}
      className={cn("truncate", className)}
    >
      {text}
    </Tag>
  );

  if (!isTruncated) return content;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-[280px] break-words border-none bg-slate-900 text-white shadow-xl"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

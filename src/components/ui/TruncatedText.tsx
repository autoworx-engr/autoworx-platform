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
  as?: "p" | "span" | "div";
  className?: string;
};

export function TruncatedText({ text, as = "p", className }: Props) {
  const Tag = as;
  const textRef = useRef<HTMLElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    setIsTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

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

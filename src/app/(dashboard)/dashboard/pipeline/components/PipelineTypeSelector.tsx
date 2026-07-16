"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import NProgress from "nprogress";
import { useEffect, useRef, useState } from "react";

type PipelineType = "sales" | "shop" | "team";

const ALL_OPTIONS: { type: PipelineType; label: string; href: string }[] = [
  {
    type: "sales",
    label: "Sales Pipeline",
    href: "/dashboard/pipeline/sales/pipeline",
  },
  {
    type: "shop",
    label: "Shop Pipeline",
    href: "/dashboard/pipeline/shop/pipeline",
  },
  {
    type: "team",
    label: "Team Pipeline",
    href: "/dashboard/pipeline/team/pipeline",
  },
];

function getOptions(employeeType?: string) {
  if (employeeType === "Technician")
    return ALL_OPTIONS.filter((o) => o.type === "shop");
  if (employeeType === "Sales")
    return ALL_OPTIONS.filter((o) => o.type === "sales");
  return ALL_OPTIONS;
}

interface PipelineTypeSelectorProps {
  currentType: PipelineType;
  employeeType?: string;
}

export default function PipelineTypeSelector({
  currentType,
  employeeType,
}: PipelineTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const options = getOptions(employeeType);
  const current = ALL_OPTIONS.find((o) => o.type === currentType);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (options.length <= 1) {
    return (
      <h1 className="mr-4 text-[26px] font-bold text-[#66738C]">
        {current?.label}
      </h1>
    );
  }

  return (
    <div className="relative mr-4" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[26px] font-bold text-[#66738C] hover:text-[#5a66ee] transition-colors"
      >
        {current?.label}
        <ChevronDown
          className={cn(
            "w-5 h-5 mt-1 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[190px] rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {options.map((option) => (
            <button
              key={option.type}
              onClick={() => {
                NProgress.start();
                router.push(option.href);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-50",
                option.type === currentType
                  ? "bg-indigo-50 text-primary"
                  : "text-slate-700",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

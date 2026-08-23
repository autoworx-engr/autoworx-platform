"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";

type TProps = {
  changesValue?: string;
  dropDownValues: string[];
  menuLabel?: string;
  defaultValue?: string;
  value?: string;
  onValueChange: (value: string) => void;
  contentClassName?: string;
  buttonClassName?: string;
  children?: React.ReactNode;
  dropdownIcon?: React.ReactNode;
  showClearButton?: boolean;
  clearLabel?: string;
  onClear?: () => void;
};

export function DropdownSelection({
  changesValue,
  menuLabel,
  dropDownValues,
  defaultValue,
  onValueChange,
  contentClassName,
  buttonClassName,
  children,
  dropdownIcon,
  showClearButton = false,
  clearLabel = "Clear",
  onClear,
}: TProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleClear = () => {
    onClear?.();
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {children ? (
          children
        ) : (
          <Button
            variant="outline"
            className={cn(
              "flex items-center justify-center gap-x-1 text-xs lg:gap-x-2",
              "rounded-xl px-3 py-2 transition-transform duration-500 ease-out transform hover:scale-[1.02]",
              // base appearance
              "bg-white dark:bg-slate-900/40",
              // default ring + hover
              "ring-1 ring-slate-900/5 dark:ring-slate-700/20 hover:ring-[#6470fd]/50 hover:shadow-sm",
              // when menu is open (radix sets aria-expanded)
              "aria-[expanded=true]:ring-2 aria-[expanded=true]:ring-[#6470fd] aria-[expanded=true]:shadow-[0_20px_40px_-12px_rgba(100,112,253,0.10)]",
              buttonClassName,
            )}
          >
            <span className="truncate max-w-[10rem] text-slate-600 dark:text-slate-200">
              {changesValue || defaultValue}
            </span>
            {dropdownIcon ? (
              dropdownIcon
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                role="img"
                className="ml-2 text-slate-500 dark:text-slate-300 transition-transform duration-200 group-hover:translate-y-0.5 aria-[expanded=true]:text-[#6470fd]"
              >
                <path d="M12 15.5L5 8.5h14l-7 7z" fill="currentColor" />
              </svg>
            )}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn(
          "w-56 max-h-80 overflow-y-auto",
          "rounded-2xl p-2 m-2 backdrop-blur-md bg-white dark:bg-slate-900/50",
          "ring-1 ring-slate-900/5 dark:ring-slate-700/20 shadow-lg border-transparent",
          "transition-all duration-200",
          contentClassName,
        )}
      >
        {menuLabel && (
          <>
            <DropdownMenuLabel className="px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {menuLabel}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuRadioGroup
          value={changesValue}
          onValueChange={onValueChange}
        >
          {dropDownValues.length > 0 ? (
            dropDownValues.map((value) => (
              <DropdownMenuRadioItem
                key={value}
                value={value}
                className={cn(
                  "group flex items-center justify-between px-3 py-2 rounded-lg text-sm border-b border-slate-200 dark:border-slate-800",
                  "text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60",
                  "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#6470fd]/20",
                  "data-[state=checked]:bg-[#6470fd] data-[state=checked]:text-white",
                  "data-[state=checked]:shadow-[0_8px_30px_rgba(100,112,253,0.12)]",
                )}
              >
                <span className="flex items-center gap-1">
                  <span className="truncate">{value}</span>
                </span>
              </DropdownMenuRadioItem>
            ))
          ) : (
            <DropdownMenuRadioItem
              key={defaultValue}
              value={defaultValue || ""}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-lg text-sm border-b border-slate-200 dark:border-slate-800",
                "text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60",
                "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#6470fd]/20",
                "data-[state=checked]:bg-[#6470fd] data-[state=checked]:text-white",
                "data-[state=checked]:shadow-[0_8px_30px_rgba(100,112,253,0.12)]",
              )}
            >
              <span className="flex items-center gap-1">
                <span className="truncate">{defaultValue}</span>
              </span>
            </DropdownMenuRadioItem>
          )}
        </DropdownMenuRadioGroup>
        {showClearButton && onClear && (
          <div className="sticky bottom-0 mt-2 rounded-2xl backdrop-blur-md dark:bg-slate-900/70">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-lg text-sm font-semibold text-white hover:text-white bg-rose-500 hover:bg-rose-600 dark:text-slate-200 dark:hover:text-white"
              onClick={handleClear}
            >
              {clearLabel}
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
}: TProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children ? (
          children
        ) : (
          <Button
            variant="outline"
            className={cn(
              "flex items-center justify-center gap-x-1 text-xs lg:gap-x-2 lg:text-base",
              buttonClassName
            )}
          >
            {changesValue || defaultValue}
            {dropdownIcon ? (
              dropdownIcon
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                aria-hidden="true"
                role="img"
              >
                <path d="M12 15.5L5 8.5h14l-7 7z" fill="currentColor" />
              </svg>
            )}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className={cn("w-56", contentClassName)}>
        {menuLabel && (
          <>
            <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuRadioGroup
          value={changesValue}
          onValueChange={onValueChange}
        >
          {dropDownValues.length > 0 ? (
            dropDownValues.map((value) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {value}
              </DropdownMenuRadioItem>
            ))
          ) : (
            <DropdownMenuRadioItem
              key={defaultValue}
              value={defaultValue || ""}
            >
              {defaultValue}
            </DropdownMenuRadioItem>
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
